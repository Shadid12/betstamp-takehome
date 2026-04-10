import Anthropic from "@anthropic-ai/sdk";
import data from "@/data/data.json";

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const SYSTEM_PROMPT = `You are a sports betting odds analyst AI. Your job is to examine sportsbook odds data and detect anomalies. You are an expert at identifying:

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

export async function POST() {
  try {
    const oddsPayload = JSON.stringify(data.odds, null, 2);

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Analyze the following sportsbook odds data for anomalies. The data contains odds from multiple sportsbooks for NBA games.\n\n${oddsPayload}`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let anomalies;
    try {
      anomalies = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        anomalies = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse Claude response as JSON");
      }
    }

    return Response.json({
      anomalies,
      meta: {
        model: "claude-sonnet-4-20250514",
        games_analyzed: new Set(data.odds.map((o) => o.game_id)).size,
        records_analyzed: data.odds.length,
        detected_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Anomaly detection failed:", error);
    return Response.json(
      {
        error: "Anomaly detection failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
