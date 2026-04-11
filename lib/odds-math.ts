export type OddsRecord = {
  game_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  sportsbook: string;
  markets: {
    spread: {
      home_line: number;
      home_odds: number;
      away_line: number;
      away_odds: number;
    };
    moneyline: {
      home_odds: number;
      away_odds: number;
    };
    total: {
      line: number;
      over_odds: number;
      under_odds: number;
    };
  };
  last_updated: string;
};

/**
 * American odds → implied probability (0–1).
 * Negative: |odds| / (|odds| + 100)
 * Positive: 100 / (odds + 100)
 */
export function impliedProbability(americanOdds: number): number {
  if (americanOdds < 0) {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
  return 100 / (americanOdds + 100);
}

/**
 * Vig (overround) for a two-sided market, as a percentage.
 * -110 / -110 → ~4.76%
 */
export function calcVig(odds1: number, odds2: number): number {
  const p1 = impliedProbability(odds1);
  const p2 = impliedProbability(odds2);
  return round((p1 + p2 - 1) * 100, 2);
}

/**
 * Remove the vig and return fair (no-vig) probabilities that sum to 100%.
 */
export function noVigFairProbabilities(
  odds1: number,
  odds2: number
): { fair1: number; fair2: number } {
  const p1 = impliedProbability(odds1);
  const p2 = impliedProbability(odds2);
  const total = p1 + p2;
  return {
    fair1: round((p1 / total) * 100, 2),
    fair2: round((p2 / total) * 100, 2),
  };
}

/**
 * Convert a fair probability (0–1) back to American odds.
 */
export function probabilityToAmerican(prob: number): number {
  if (prob >= 0.5) {
    return round((-prob / (1 - prob)) * 100, 0);
  }
  return round(((1 - prob) / prob) * 100, 0);
}

/**
 * Find the best line (highest payout / lowest implied probability) from a set of offerings.
 */
export function findBestOdds<T extends { odds: number }>(
  entries: T[]
): T | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) =>
    impliedProbability(entry.odds) < impliedProbability(best.odds)
      ? entry
      : best
  );
}

/**
 * Detect arbitrage: if the best odds on each side combine to < 100% implied probability,
 * there's a guaranteed profit.
 */
export function detectArbitrage(
  side1Odds: number,
  side2Odds: number
): { exists: boolean; combinedProb: number; profitMarginPct: number } {
  const combined = impliedProbability(side1Odds) + impliedProbability(side2Odds);
  return {
    exists: combined < 1,
    combinedProb: round(combined, 6),
    profitMarginPct: round((1 - combined) * 100, 2),
  };
}

/**
 * Compute the median of a numeric array.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
