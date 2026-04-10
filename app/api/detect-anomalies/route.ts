import Anthropic from "@anthropic-ai/sdk";
import data from "@/data/data.json";

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const ANOMALY_SYSTEM_PROMPT = `You are a sports betting odds analyst AI. Your job is to examine sportsbook odds data and detect anomalies. You are an expert at identifying:

1. **Stale Lines** — A sportsbook's last_updated timestamp is significantly older than others for the same game, suggesting the data hasn't refreshed.
2. **Outlier Prices** — A line or odds value deviates significantly from the consensus across sportsbooks for the same game and market (e.g. a spread of -9.5 when everyone else has -5.5).
3. **Potential Errors** — Impossible or suspicious values like mismatched spread lines (home_line + away_line ≠ 0), extreme moneyline values, totals that are far from consensus, or odds that imply nonsensical vig.

When analyzing, compare each sportsbook's numbers against all others for the same game. Minor half-point differences in spreads/totals and small odds variations (10-20 cents) are normal in betting markets.

Return your analysis as a JSON array of anomaly objects. Each anomaly must have:
- "game_id": the game identifier
- "sportsbook": the sportsbook name
- "type": one of "stale_line", "outlier_price", or "potential_error"
- "severity": one of "low", "medium", or "high"
- "market": the affected market (e.g. "spread", "moneyline", "total", or "timestamp")
- "description": a concise explanation of the anomaly (1-2 sentences)
- "details": object with the anomalous value(s) and what the consensus/expected values are

Return ONLY the JSON array, no markdown fences, no extra text.`;

const ANALYSIS_SYSTEM_PROMPT = `You are an expert sports betting odds analyst. Your job is to analyze sportsbook odds data across multiple books for each game and produce actionable insights for bettors.

For each game, you must:

1. **Best Available Odds** — For every market (spread, moneyline, total), identify which sportsbook offers the best price for each side. "Best" means the highest payout for the bettor (e.g. -105 is better than -115; +200 is better than +180).

2. **Vig (Juice) Calculation** — For each sportsbook and market, calculate the implied vig/overround. Use American odds → implied probability conversion:
   - Negative odds: probability = |odds| / (|odds| + 100)
   - Positive odds: probability = 100 / (odds + 100)
   The vig = (sum of implied probabilities - 1) × 100, expressed as a percentage.
   Identify the lowest-vig (sharpest) book for each game/market.

3. **Value Opportunities** — Flag situations where a bettor can get meaningfully better odds at one book vs. the market consensus. A value opportunity exists when one book's odds deviate from the consensus in the bettor's favor by a significant margin (roughly 10+ cents of value). Also flag any arbitrage opportunities where you can bet both sides across different books for a guaranteed profit.

Return a JSON object with this structure:
{
  "games": [
    {
      "game_id": "string",
      "home_team": "string",
      "away_team": "string",
      "best_odds": {
        "spread": {
          "home": { "sportsbook": "string", "line": number, "odds": number },
          "away": { "sportsbook": "string", "line": number, "odds": number }
        },
        "moneyline": {
          "home": { "sportsbook": "string", "odds": number },
          "away": { "sportsbook": "string", "odds": number }
        },
        "total": {
          "over": { "sportsbook": "string", "line": number, "odds": number },
          "under": { "sportsbook": "string", "line": number, "odds": number }
        }
      },
      "vig_by_book": [
        {
          "sportsbook": "string",
          "spread_vig": number,
          "moneyline_vig": number,
          "total_vig": number
        }
      ],
      "sharpest_book": "string",
      "value_opportunities": [
        {
          "market": "string",
          "side": "string",
          "sportsbook": "string",
          "odds": number,
          "consensus_odds": number,
          "edge_description": "string"
        }
      ]
    }
  ],
  "arbitrage_opportunities": [
    {
      "game_id": "string",
      "market": "string",
      "leg1": { "side": "string", "sportsbook": "string", "odds": number },
      "leg2": { "side": "string", "sportsbook": "string", "odds": number },
      "combined_implied_probability": number,
      "profit_margin_pct": number,
      "description": "string"
    }
  ]
}

Return ONLY the JSON object, no markdown fences, no extra text.`;

const BRIEFING_SYSTEM_PROMPT = `You are a senior sports betting market analyst writing a daily briefing for a trading desk. Your briefings are concise, data-driven, and actionable. You write in a professional but readable tone — like a Bloomberg terminal note crossed with a sharp analyst memo.

You will receive:
1. Raw odds data for today's games
2. Anomaly detection results (stale lines, outlier prices, errors)
3. Market analysis results (best odds, vig calculations, value opportunities, arbitrage)

From these inputs, produce a structured daily market briefing in Markdown format with the following sections:

## Market Overview
A 2-3 sentence executive summary of the day's slate: how many games, general market health, and the most noteworthy finding.

## Data Quality Alerts
Summarize the anomalies that require attention. Group by severity (critical first). For each, name the sportsbook, game, and issue. If there are stale feeds, call out which books to treat with caution. Keep this tight — bullet points, not paragraphs.

## Top Value Plays
The 3-5 most actionable value opportunities ranked by edge size. For each:
- The bet (team/side, market, line/odds)
- Where to place it (sportsbook)
- The edge vs. consensus
- A one-line rationale

## Arbitrage Alert
If any arbitrage exists, lay out each opportunity with both legs, the sportsbooks involved, and the guaranteed profit margin. If none, state "No arbitrage opportunities detected."

## Sharpest Books Today
Rank the sportsbooks by overall vig/sharpness. Call out which book is consistently offering the best prices and which are the juiciest (worst for bettors).

## Game-by-Game Snapshot
For each game, provide a compact 2-3 line summary: the consensus line, where the best price is, and any notable discrepancies. Order games by commence time.

## Analyst Notes
1-3 bullet points with higher-level observations: market trends, books to watch, anything unusual about the overall slate.

Write in Markdown. Be specific with numbers — use actual odds, lines, vig percentages, and sportsbook names. Do not hedge or add disclaimers. Write as if the reader is a professional who will act on this information.`;

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
    // Try extracting a JSON array or object from the text
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

    // If JSON was truncated, attempt to repair by closing brackets
    const trimmed = text.replace(/^[^[{]*/, "");
    const repaired = repairJson(trimmed);
    if (repaired) return repaired;

    throw new Error("Failed to parse Claude response as JSON");
  }
}

function repairJson(text: string): unknown | null {
  // Attempt to fix truncated JSON by closing open brackets/braces
  let attempt = text;
  for (let i = 0; i < 10; i++) {
    try {
      return JSON.parse(attempt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Expected ',' or '}'") || msg.includes("Unterminated")) {
        // Try closing with } or ]
        const openBraces = (attempt.match(/\{/g) || []).length;
        const closeBraces = (attempt.match(/\}/g) || []).length;
        const openBrackets = (attempt.match(/\[/g) || []).length;
        const closeBrackets = (attempt.match(/\]/g) || []).length;

        // Trim trailing partial values (incomplete strings, trailing commas)
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

    // Step 1: Run anomaly detection and odds analysis in parallel
    const [anomalyResponse, analysisResponse] = await Promise.all([
      callWithRetry(() =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: ANOMALY_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Analyze the following sportsbook odds data for anomalies. The data contains odds from multiple sportsbooks for NBA games.\n\n${oddsPayload}`,
            },
          ],
        })
      ),
      callWithRetry(() =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16000,
          system: ANALYSIS_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Analyze the following sportsbook odds data. Identify best available odds, calculate vig for each book/market, and surface value opportunities and any arbitrage.\n\n${oddsPayload}`,
            },
          ],
        })
      ),
    ]);

    const anomalyText =
      anomalyResponse.content[0].type === "text"
        ? anomalyResponse.content[0].text
        : "";
    const analysisText =
      analysisResponse.content[0].type === "text"
        ? analysisResponse.content[0].text
        : "";

    const anomalies = parseJsonResponse(anomalyText);
    const analysis = parseJsonResponse(analysisText);

    // Step 2: Feed both results into a third call to generate the briefing
    const briefingResponse = await callWithRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: BRIEFING_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate today's daily market briefing based on the following data.

RAW ODDS DATA (${data.odds.length} records across ${new Set(data.odds.map((o) => o.game_id)).size} games):
${oddsPayload}

ANOMALY DETECTION RESULTS:
${JSON.stringify(anomalies, null, 2)}

MARKET ANALYSIS RESULTS:
${JSON.stringify(analysis, null, 2)}`,
          },
        ],
      })
    );

    const briefing =
      briefingResponse.content[0].type === "text"
        ? briefingResponse.content[0].text
        : "";

    return Response.json({
      anomalies,
      analysis,
      briefing,
      meta: {
        model: "claude-sonnet-4-20250514",
        games_analyzed: new Set(data.odds.map((o) => o.game_id)).size,
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
