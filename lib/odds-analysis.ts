import {
  type OddsRecord,
  impliedProbability,
  calcVig,
  noVigFairProbabilities,
  probabilityToAmerican,
  findBestOdds,
  detectArbitrage,
  median,
} from "./odds-math";

// ── Output types (match what the frontend already consumes) ──────────────────

export type BestOddsSide = {
  sportsbook: string;
  odds: number;
  line?: number;
};

export type VigByBook = {
  sportsbook: string;
  spread_vig: number;
  moneyline_vig: number;
  total_vig: number;
};

export type ValueOpportunity = {
  market: string;
  side: string;
  sportsbook: string;
  odds: number;
  consensus_odds: number;
  edge_description: string;
};

export type GameAnalysis = {
  game_id: string;
  home_team: string;
  away_team: string;
  best_odds: {
    spread: { home: BestOddsSide; away: BestOddsSide };
    moneyline: { home: BestOddsSide; away: BestOddsSide };
    total: { over: BestOddsSide; under: BestOddsSide };
  };
  vig_by_book: VigByBook[];
  sharpest_book: string;
  value_opportunities: ValueOpportunity[];
  no_vig_fair_odds: {
    spread: { home_prob: number; away_prob: number };
    moneyline: { home_prob: number; away_prob: number; home_american: number; away_american: number };
    total: { over_prob: number; under_prob: number };
  };
};

export type ArbitrageOpportunity = {
  game_id: string;
  market: string;
  leg1: { side: string; sportsbook: string; odds: number };
  leg2: { side: string; sportsbook: string; odds: number };
  combined_implied_probability: number;
  profit_margin_pct: number;
  description: string;
};

export type SportsbookRanking = {
  sportsbook: string;
  avg_spread_vig: number;
  avg_moneyline_vig: number;
  avg_total_vig: number;
  avg_combined_vig: number;
  games_with_best_odds: number;
  total_value_opps_offered: number;
  rank: number;
  grade: "A" | "B" | "C" | "D" | "F";
};

export type TopValuePlay = {
  rank: number;
  game_id: string;
  home_team: string;
  away_team: string;
  market: string;
  side: string;
  sportsbook: string;
  odds: number;
  consensus_odds: number;
  edge_cents: number;
  edge_description: string;
};

export type FullAnalysis = {
  games: GameAnalysis[];
  arbitrage_opportunities: ArbitrageOpportunity[];
  sportsbook_rankings: SportsbookRanking[];
  top_value_plays: TopValuePlay[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

type BookOdds = { sportsbook: string; odds: number; line?: number };

function medianOdds(entries: BookOdds[]): number {
  return median(entries.map((e) => e.odds));
}

const VALUE_THRESHOLD_CENTS = 10;

function oddsEdgeCents(offered: number, consensus: number): number {
  const offeredProb = impliedProbability(offered);
  const consensusProb = impliedProbability(consensus);
  return Math.round((consensusProb - offeredProb) * 10000) / 100;
}

// ── Main computation ─────────────────────────────────────────────────────────

export function computeFullAnalysis(odds: OddsRecord[]): FullAnalysis {
  const gameIds = Array.from(new Set(odds.map((o) => o.game_id)));
  const games: GameAnalysis[] = [];
  const allArbs: ArbitrageOpportunity[] = [];

  for (const gameId of gameIds) {
    const records = odds.filter((o) => o.game_id === gameId);
    const first = records[0];

    // ── Collect per-side odds across books ──

    const spreadHome: BookOdds[] = records.map((r) => ({
      sportsbook: r.sportsbook,
      odds: r.markets.spread.home_odds,
      line: r.markets.spread.home_line,
    }));
    const spreadAway: BookOdds[] = records.map((r) => ({
      sportsbook: r.sportsbook,
      odds: r.markets.spread.away_odds,
      line: r.markets.spread.away_line,
    }));
    const mlHome: BookOdds[] = records.map((r) => ({
      sportsbook: r.sportsbook,
      odds: r.markets.moneyline.home_odds,
    }));
    const mlAway: BookOdds[] = records.map((r) => ({
      sportsbook: r.sportsbook,
      odds: r.markets.moneyline.away_odds,
    }));
    const totalOver: BookOdds[] = records.map((r) => ({
      sportsbook: r.sportsbook,
      odds: r.markets.total.over_odds,
      line: r.markets.total.line,
    }));
    const totalUnder: BookOdds[] = records.map((r) => ({
      sportsbook: r.sportsbook,
      odds: r.markets.total.under_odds,
      line: r.markets.total.line,
    }));

    // ── Best available odds ──

    const bestSpreadHome = findBestOdds(spreadHome)!;
    const bestSpreadAway = findBestOdds(spreadAway)!;
    const bestMlHome = findBestOdds(mlHome)!;
    const bestMlAway = findBestOdds(mlAway)!;
    const bestOver = findBestOdds(totalOver)!;
    const bestUnder = findBestOdds(totalUnder)!;

    // ── Vig by book ──

    const vigByBook: VigByBook[] = records.map((r) => ({
      sportsbook: r.sportsbook,
      spread_vig: calcVig(r.markets.spread.home_odds, r.markets.spread.away_odds),
      moneyline_vig: calcVig(r.markets.moneyline.home_odds, r.markets.moneyline.away_odds),
      total_vig: calcVig(r.markets.total.over_odds, r.markets.total.under_odds),
    }));

    const sharpest = vigByBook.reduce((best, curr) => {
      const bestTotal = best.spread_vig + best.moneyline_vig + best.total_vig;
      const currTotal = curr.spread_vig + curr.moneyline_vig + curr.total_vig;
      return currTotal < bestTotal ? curr : best;
    });

    // ── No-vig fair odds (using the sharpest book as reference) ──

    const sharpRecord = records.find((r) => r.sportsbook === sharpest.sportsbook)!;
    const fairSpread = noVigFairProbabilities(
      sharpRecord.markets.spread.home_odds,
      sharpRecord.markets.spread.away_odds
    );
    const fairMl = noVigFairProbabilities(
      sharpRecord.markets.moneyline.home_odds,
      sharpRecord.markets.moneyline.away_odds
    );
    const fairTotal = noVigFairProbabilities(
      sharpRecord.markets.total.over_odds,
      sharpRecord.markets.total.under_odds
    );

    // ── Value opportunities ──

    const valueOpps: ValueOpportunity[] = [];

    const checks: {
      market: string;
      side: string;
      entries: BookOdds[];
    }[] = [
      { market: "spread", side: "home", entries: spreadHome },
      { market: "spread", side: "away", entries: spreadAway },
      { market: "moneyline", side: "home", entries: mlHome },
      { market: "moneyline", side: "away", entries: mlAway },
      { market: "total", side: "over", entries: totalOver },
      { market: "total", side: "under", entries: totalUnder },
    ];

    for (const { market, side, entries } of checks) {
      const consensusOdds = medianOdds(entries);
      for (const entry of entries) {
        const edge = oddsEdgeCents(entry.odds, consensusOdds);
        if (edge >= VALUE_THRESHOLD_CENTS) {
          const team =
            side === "home" || side === "over"
              ? first.home_team
              : first.away_team;
          const label =
            side === "over" || side === "under"
              ? `${side.charAt(0).toUpperCase() + side.slice(1)} ${entry.line ?? ""}`
              : `${team} (${side})`;
          valueOpps.push({
            market,
            side,
            sportsbook: entry.sportsbook,
            odds: entry.odds,
            consensus_odds: consensusOdds,
            edge_description: `${label} at ${formatAmerican(entry.odds)} vs. consensus ${formatAmerican(consensusOdds)} — ${edge.toFixed(1)} cents of value`,
          });
        }
      }
    }

    valueOpps.sort(
      (a, b) =>
        oddsEdgeCents(b.odds, b.consensus_odds) -
        oddsEdgeCents(a.odds, a.consensus_odds)
    );

    // ── Arbitrage detection ──

    const arbChecks: {
      market: string;
      side1Label: string;
      side2Label: string;
      best1: BookOdds;
      best2: BookOdds;
    }[] = [
      { market: "spread", side1Label: "home", side2Label: "away", best1: bestSpreadHome, best2: bestSpreadAway },
      { market: "moneyline", side1Label: "home", side2Label: "away", best1: bestMlHome, best2: bestMlAway },
      { market: "total", side1Label: "over", side2Label: "under", best1: bestOver, best2: bestUnder },
    ];

    for (const { market, side1Label, side2Label, best1, best2 } of arbChecks) {
      const arb = detectArbitrage(best1.odds, best2.odds);
      if (arb.exists) {
        allArbs.push({
          game_id: gameId,
          market,
          leg1: { side: side1Label, sportsbook: best1.sportsbook, odds: best1.odds },
          leg2: { side: side2Label, sportsbook: best2.sportsbook, odds: best2.odds },
          combined_implied_probability: arb.combinedProb,
          profit_margin_pct: arb.profitMarginPct,
          description: `${market}: ${side1Label} ${formatAmerican(best1.odds)} @ ${best1.sportsbook} + ${side2Label} ${formatAmerican(best2.odds)} @ ${best2.sportsbook} → ${arb.profitMarginPct.toFixed(2)}% guaranteed profit`,
        });
      }
    }

    games.push({
      game_id: gameId,
      home_team: first.home_team,
      away_team: first.away_team,
      best_odds: {
        spread: {
          home: { sportsbook: bestSpreadHome.sportsbook, odds: bestSpreadHome.odds, line: bestSpreadHome.line },
          away: { sportsbook: bestSpreadAway.sportsbook, odds: bestSpreadAway.odds, line: bestSpreadAway.line },
        },
        moneyline: {
          home: { sportsbook: bestMlHome.sportsbook, odds: bestMlHome.odds },
          away: { sportsbook: bestMlAway.sportsbook, odds: bestMlAway.odds },
        },
        total: {
          over: { sportsbook: bestOver.sportsbook, odds: bestOver.odds, line: bestOver.line },
          under: { sportsbook: bestUnder.sportsbook, odds: bestUnder.odds, line: bestUnder.line },
        },
      },
      vig_by_book: vigByBook,
      sharpest_book: sharpest.sportsbook,
      value_opportunities: valueOpps,
      no_vig_fair_odds: {
        spread: { home_prob: fairSpread.fair1, away_prob: fairSpread.fair2 },
        moneyline: {
          home_prob: fairMl.fair1,
          away_prob: fairMl.fair2,
          home_american: probabilityToAmerican(fairMl.fair1 / 100),
          away_american: probabilityToAmerican(fairMl.fair2 / 100),
        },
        total: { over_prob: fairTotal.fair1, under_prob: fairTotal.fair2 },
      },
    });
  }

  // ── Sportsbook rankings (aggregated across all games) ──

  const bookStats = new Map<
    string,
    { spreadVigs: number[]; mlVigs: number[]; totalVigs: number[]; bestOddsCount: number; valueOppsCount: number }
  >();

  for (const game of games) {
    for (const vig of game.vig_by_book) {
      let stats = bookStats.get(vig.sportsbook);
      if (!stats) {
        stats = { spreadVigs: [], mlVigs: [], totalVigs: [], bestOddsCount: 0, valueOppsCount: 0 };
        bookStats.set(vig.sportsbook, stats);
      }
      stats.spreadVigs.push(vig.spread_vig);
      stats.mlVigs.push(vig.moneyline_vig);
      stats.totalVigs.push(vig.total_vig);
    }

    const bestBooks = [
      game.best_odds.spread.home.sportsbook,
      game.best_odds.spread.away.sportsbook,
      game.best_odds.moneyline.home.sportsbook,
      game.best_odds.moneyline.away.sportsbook,
      game.best_odds.total.over.sportsbook,
      game.best_odds.total.under.sportsbook,
    ];
    for (const book of bestBooks) {
      const stats = bookStats.get(book);
      if (stats) stats.bestOddsCount++;
    }

    for (const v of game.value_opportunities) {
      const stats = bookStats.get(v.sportsbook);
      if (stats) stats.valueOppsCount++;
    }
  }

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const rankings: SportsbookRanking[] = Array.from(bookStats.entries())
    .map(([sportsbook, stats]) => {
      const avgSpread = round2(avg(stats.spreadVigs));
      const avgMl = round2(avg(stats.mlVigs));
      const avgTotal = round2(avg(stats.totalVigs));
      const avgCombined = round2((avgSpread + avgMl + avgTotal) / 3);
      return {
        sportsbook,
        avg_spread_vig: avgSpread,
        avg_moneyline_vig: avgMl,
        avg_total_vig: avgTotal,
        avg_combined_vig: avgCombined,
        games_with_best_odds: stats.bestOddsCount,
        total_value_opps_offered: stats.valueOppsCount,
        rank: 0,
        grade: "C" as SportsbookRanking["grade"],
      };
    })
    .sort((a, b) => a.avg_combined_vig - b.avg_combined_vig);

  rankings.forEach((r, i) => {
    r.rank = i + 1;
    if (r.avg_combined_vig <= 2) r.grade = "A";
    else if (r.avg_combined_vig <= 3) r.grade = "B";
    else if (r.avg_combined_vig <= 4) r.grade = "C";
    else if (r.avg_combined_vig <= 5) r.grade = "D";
    else r.grade = "F";
  });

  // ── Top value plays (global, ranked by edge) ──

  const allValuePlays: TopValuePlay[] = games.flatMap((g) =>
    g.value_opportunities.map((v) => ({
      rank: 0,
      game_id: g.game_id,
      home_team: g.home_team,
      away_team: g.away_team,
      market: v.market,
      side: v.side,
      sportsbook: v.sportsbook,
      odds: v.odds,
      consensus_odds: v.consensus_odds,
      edge_cents: round2(oddsEdgeCents(v.odds, v.consensus_odds)),
      edge_description: v.edge_description,
    }))
  );

  allValuePlays.sort((a, b) => b.edge_cents - a.edge_cents);
  const topValuePlays = allValuePlays.slice(0, 10);
  topValuePlays.forEach((v, i) => { v.rank = i + 1; });

  return {
    games,
    arbitrage_opportunities: allArbs,
    sportsbook_rankings: rankings,
    top_value_plays: topValuePlays,
  };
}

function formatAmerican(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}
