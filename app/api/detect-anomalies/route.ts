import Anthropic from "@anthropic-ai/sdk";
import data from "@/data/data.json";
import { computeFullAnalysis } from "@/lib/odds-analysis";
import type { OddsRecord } from "@/lib/odds-math";

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const ANOMALY_SYSTEM_PROMPT = `You are a sports betting odds analyst AI. Your job is to examine sportsbook odds data and detect anomalies. You are an expert at identifying:

1. **Stale Lines** — A sportsbook's last_updated timestamp is significantly older than others for the same game, suggesting the data hasn't refreshed.
2. **Outlier Prices** — A line or odds value deviates significantly from the consensus across sportsbooks for the same game and market (e.g. a spread of -9.5 when everyone else has -5.5).
3. **Potential Errors** — Impossible or suspicious values like mismatched spread lines (home_line + away_line ≠ 0), extreme moneyline values, totals that are far from consensus, or odds that imply nonsensical vig.

When analyzing, compare each sportsbook's numbers against all others for the same game. Minor half-point differences in spreads/totals and small odds variations (10-20 cents) are normal in betting markets.

You are also provided with pre-computed market analysis (vig calculations, best odds, value opportunities, arbitrage) produced by deterministic code. Use this data as ground truth — do NOT re-derive any math. If a vig value looks extreme, flag it. If the pre-computed analysis shows an outlier, reference it.

Return your analysis as a JSON array of anomaly objects. Each anomaly must have:
- "game_id": the game identifier
- "sportsbook": the sportsbook name
- "type": one of "stale_line", "outlier_price", or "potential_error"
- "severity": one of "low", "medium", or "high"
- "market": the affected market (e.g. "spread", "moneyline", "total", or "timestamp")
- "description": a concise explanation of the anomaly (1-2 sentences)
- "details": object with the anomalous value(s) and what the consensus/expected values are

GUARDRAIL — SCOPE ENFORCEMENT:
Only analyze data that is explicitly present in the provided odds payload. Do NOT fabricate games, sportsbooks, odds values, or anomalies that are not supported by the input data. If the data is insufficient to determine whether something is an anomaly, omit it rather than guessing. Return an empty array [] if no anomalies are detected.

Return ONLY the JSON array, no markdown fences, no extra text.`;

const BRIEFING_SYSTEM_PROMPT = `You are a senior sports betting market analyst writing a daily briefing for a trading desk. Your briefings are concise, data-driven, and actionable. You write in a professional but readable tone — like a Bloomberg terminal note crossed with a sharp analyst memo.

You will receive:
1. Raw odds data for today's games
2. Anomaly detection results (stale lines, outlier prices, errors) — produced by AI pattern-matching
3. Pre-computed market analysis (best odds, vig calculations, value opportunities, sportsbook rankings, arbitrage) — produced by deterministic code, treat all numbers as exact

CRITICAL: All math in the "MARKET ANALYSIS RESULTS" section is computed by verified code and is exact. Do NOT re-derive, round differently, or second-guess any vig percentages, implied probabilities, or profit margins. Quote them verbatim.

Return a JSON object (not markdown) with exactly these fields:
{
  "market_overview": "A 2-3 sentence executive summary of the day's slate: how many games, general market health, and the most noteworthy finding.",
  "game_snapshots": [
    {
      "game_id": "the game id",
      "headline": "2-3 sentence summary: consensus line, where the best price is, and any notable discrepancies"
    }
  ],
  "analyst_notes": ["1-3 bullet points with higher-level observations: market trends, books to watch, anything unusual about the overall slate"]
}

Rules:
- The "market_overview" should be a tight executive summary (2-3 sentences). Reference specific numbers from the analysis.
- Each "game_snapshots" entry should cover the consensus line, best price, and any discrepancies. Order by commence time.
- "analyst_notes" should be 1-3 concise, actionable observations.
- Be specific with numbers — use actual odds, lines, vig percentages, and sportsbook names.
- Do not hedge or add disclaimers. Write as if the reader is a professional who will act on this information.
- Return ONLY the JSON object, no markdown fences, no extra text.

GUARDRAIL — SCOPE ENFORCEMENT:
Only reference games, sportsbooks, odds, and analysis numbers that are explicitly present in the provided data. Do NOT invent or infer data points that are not in the input. If a game has insufficient data for a meaningful snapshot, say so in its headline rather than fabricating details.`;

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes("529") ||
          err.message.includes("overloaded") ||
          err.message.includes("rate"));
      if (!isRetryable || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error("Unreachable");
}

function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        /* fall through */
      }
    }

    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        /* fall through */
      }
    }

    const trimmed = text.replace(/^[^[{]*/, "");
    const repaired = repairJson(trimmed);
    if (repaired) return repaired;

    throw new Error("Failed to parse Claude response as JSON");
  }
}

function repairJson(text: string): unknown | null {
  let attempt = text;
  for (let i = 0; i < 10; i++) {
    try {
      return JSON.parse(attempt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Expected ',' or '}'") || msg.includes("Unterminated")) {
        const openBraces = (attempt.match(/\{/g) || []).length;
        const closeBraces = (attempt.match(/\}/g) || []).length;
        const openBrackets = (attempt.match(/\[/g) || []).length;
        const closeBrackets = (attempt.match(/\]/g) || []).length;

        attempt = attempt.replace(/,\s*$/, "");
        attempt = attempt.replace(/"[^"]*$/, '""');

        if (openBrackets > closeBrackets) {
          attempt += "]".repeat(openBrackets - closeBrackets);
        }
        if (openBraces > closeBraces) {
          attempt += "}".repeat(openBraces - closeBraces);
        }
      } else {
        return null;
      }
    }
  }
  return null;
}

export async function POST() {
  try {
    const oddsPayload = JSON.stringify(data.odds, null, 2);
    const gamesCount = new Set(data.odds.map((o) => o.game_id)).size;

    const analysis = computeFullAnalysis(data.odds as OddsRecord[]);
    const analysisPayload = JSON.stringify(analysis, null, 2);

    // Step 1: Claude does anomaly detection (pattern matching / judgment)
    const anomalyResponse = await callWithRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: ANOMALY_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analyze the following sportsbook odds data for anomalies. The data contains odds from multiple sportsbooks for NBA games.

RAW ODDS DATA:
${oddsPayload}

PRE-COMPUTED MARKET ANALYSIS (use as reference — these numbers are exact):
${analysisPayload}`,
          },
        ],
      })
    );

    const anomalyText =
      anomalyResponse.content[0].type === "text"
        ? anomalyResponse.content[0].text
        : "";

    const anomalies = parseJsonResponse(anomalyText) as AnomalyDetail[];

    // Step 2: Claude generates the narrative sections (overview, game snapshots, analyst notes)
    const briefingResponse = await callWithRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: BRIEFING_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate today's daily market briefing based on the following data.

RAW ODDS DATA (${data.odds.length} records across ${gamesCount} games):
${oddsPayload}

ANOMALY DETECTION RESULTS:
${JSON.stringify(anomalies, null, 2)}

MARKET ANALYSIS RESULTS (computed by deterministic code — all numbers are exact, quote them verbatim):
${analysisPayload}`,
          },
        ],
      })
    );

    const briefingText =
      briefingResponse.content[0].type === "text"
        ? briefingResponse.content[0].text
        : "";

    const narrativeSections = parseJsonResponse(briefingText) as {
      market_overview: string;
      game_snapshots: { game_id: string; headline: string }[];
      analyst_notes: string[];
    };

    // Step 3: Assemble the structured daily briefing
    const dailyBriefing = {
      market_overview: narrativeSections.market_overview ?? "",
      anomalies: anomalies,
      top_value_plays: analysis.top_value_plays,
      arbitrage_opportunities: analysis.arbitrage_opportunities,
      sportsbook_rankings: analysis.sportsbook_rankings,
      game_snapshots: narrativeSections.game_snapshots ?? [],
      analyst_notes: narrativeSections.analyst_notes ?? [],
    };

    return Response.json({
      daily_briefing: dailyBriefing,
      analysis,
      meta: {
        model: "claude-sonnet-4-20250514",
        games_analyzed: gamesCount,
        records_analyzed: data.odds.length,
        detected_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Odds agent failed:", error);
    return Response.json(
      {
        error: "Odds agent failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

type AnomalyDetail = {
  game_id: string;
  sportsbook: string;
  type: "stale_line" | "outlier_price" | "potential_error";
  severity: "low" | "medium" | "high";
  market: string;
  description: string;
  details: Record<string, unknown>;
};
