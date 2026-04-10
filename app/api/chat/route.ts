import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const CHAT_SYSTEM_PROMPT = `You are an expert sports betting analyst assistant. You have just completed a comprehensive analysis of today's odds slate, including anomaly detection, best-odds identification, vig calculation, value opportunity surfacing, and a full market briefing.

The user will provide the full context of the analysis results, and then ask follow-up questions. Answer precisely and actionably. Use specific numbers, sportsbook names, odds, lines, and vig percentages. Be concise — the user is a professional.

When asked about specific games, refer to the data you've been given. When asked for opinions or recommendations, ground them in the data. If the data doesn't cover something, say so clearly rather than speculating.

Format your responses in Markdown for readability. Use bold for key callouts, code for odds/numbers when helpful, and bullet points for lists.`;

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

    const contextBlock = `Here is the full analysis context for today's slate:

ANOMALY DETECTION RESULTS:
${JSON.stringify(context.anomalies, null, 2)}

MARKET ANALYSIS RESULTS:
${JSON.stringify(context.analysis, null, 2)}

DAILY BRIEFING:
${context.briefing}`;

    const anthropicMessages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: contextBlock,
      },
      {
        role: "assistant",
        content:
          "I have the full analysis context loaded. I'm ready to answer any follow-up questions about the odds data, anomalies, value opportunities, vig calculations, or any specific games and sportsbooks.",
      },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: CHAT_SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return Response.json({ message: text });
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
