import Anthropic from "@anthropic-ai/sdk";
import { ODDS_TOOLS, executeTool, TOOL_DESCRIPTIONS } from "@/lib/data-search";

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const MAX_TOOL_ROUNDS = 10;

const CHAT_SYSTEM_PROMPT = `You are an expert sports betting analyst assistant. You have access to tools that let you query today's odds dataset (10 NBA games × 8 sportsbooks = 80 records).

The user will also provide pre-computed analysis context (anomalies, vig calculations, value plays, arbitrage, sportsbook rankings, briefing). That analysis was computed by deterministic code and is mathematically exact — quote those numbers verbatim.

TOOL USAGE STRATEGY:
- Use list_games FIRST if you need to discover which games are in the data.
- Use get_game_odds or compare_sportsbooks_for_game when the user asks about a specific game.
- Use get_sportsbook_odds when comparing a specific book across games.
- Use get_market_odds to pull spread/moneyline/total data across the slate.
- Use find_best_odds to identify where to get the best price on a game.
- Use get_line_for_game_and_book for pinpoint lookups ("What does DK have for the Lakers game?").
- Use find_stale_lines to identify potentially outdated data.
- You may call multiple tools in a single turn if needed.

GUARDRAIL — SCOPE ENFORCEMENT:
You may ONLY answer questions addressable using the provided analysis context or the tools.

If the user asks about ANY of the following, respond with: **"This question is out of scope."** followed by a one-sentence explanation. Do NOT attempt an answer.
- Games, teams, or sports NOT in the data
- Historical stats, win/loss records, player props, injuries, or roster info (unless in the data)
- Future predictions, game outcomes, or score forecasts — you analyze odds markets, not predict results
- Topics unrelated to sports betting odds analysis

When in doubt, err on the side of saying the question is out of scope.

Format responses in Markdown. Use bold for key callouts, code for odds/numbers, and bullet points for lists. Be concise — the user is a professional.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
  context: {
    anomalies: unknown;
    analysis: unknown;
    briefing: string;
  };
};

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, context } = body;

    if (!messages || messages.length === 0) {
      return Response.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    const contextBlock = `Here is the pre-computed analysis context for today's slate:

ANOMALY DETECTION RESULTS:
${JSON.stringify(context.anomalies, null, 2)}

MARKET ANALYSIS RESULTS (computed by deterministic code — all numbers are exact):
${JSON.stringify(context.analysis, null, 2)}

DAILY BRIEFING:
${context.briefing}

You also have tools to query the raw odds dataset directly for any specific data the user asks about.`;

    const anthropicMessages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: contextBlock,
      },
      {
        role: "assistant",
        content:
          "I have the pre-computed analysis loaded and tools ready to query the raw odds dataset. I can answer questions about specific games, sportsbooks, markets, value plays, anomalies, or anything else in today's slate.",
      },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: Record<string, unknown>) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }

        try {
          let finalText = "";

          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            send({ type: "status", message: round === 0 ? "Thinking..." : "Processing tool results..." });

            const response = await client.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2048,
              system: CHAT_SYSTEM_PROMPT,
              tools: ODDS_TOOLS,
              messages: anthropicMessages,
            });

            if (response.stop_reason === "end_turn") {
              finalText = response.content
                .filter((b): b is Anthropic.TextBlock => b.type === "text")
                .map((b) => b.text)
                .join("");
              break;
            }

            if (response.stop_reason === "tool_use") {
              anthropicMessages.push({ role: "assistant", content: response.content });

              const toolCalls = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
              );

              for (const toolCall of toolCalls) {
                send({
                  type: "tool_call",
                  tool: toolCall.name,
                  label: TOOL_DESCRIPTIONS[toolCall.name] ?? toolCall.name,
                  input: toolCall.input,
                });
              }

              const toolResults: Anthropic.ToolResultBlockParam[] = toolCalls.map(
                (toolCall) => {
                  const result = executeTool(
                    toolCall.name,
                    toolCall.input as Record<string, unknown>
                  );

                  send({
                    type: "tool_result",
                    tool: toolCall.name,
                    records: countRecords(result),
                  });

                  return {
                    type: "tool_result" as const,
                    tool_use_id: toolCall.id,
                    content: result,
                  };
                }
              );

              anthropicMessages.push({ role: "user", content: toolResults });
              continue;
            }

            finalText = response.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("");
            break;
          }

          send({ type: "message", content: finalText });
        } catch (error) {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat failed:", error);
    return Response.json(
      {
        error: "Chat failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function countRecords(jsonStr: string): number | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed.length;
    return null;
  } catch {
    return null;
  }
}
