import { type OddsRecord } from "./odds-math";
import type Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// ── Dataset loader ──────────────────────────────────────────────────────────

type OddsDataset = {
  description: string;
  generated: string;
  notes: string[];
  odds: OddsRecord[];
};

let cachedData: OddsDataset | null = null;

function loadOddsData(): OddsDataset {
  if (cachedData) return cachedData;
  const dataPath = path.join(process.cwd(), "data", "data.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  cachedData = JSON.parse(raw) as OddsDataset;
  return cachedData;
}

// ── Tool definitions (Anthropic format) ─────────────────────────────────────

export const ODDS_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_games",
    description:
      "List all games in today's slate. Returns game_id, home_team, away_team, commence_time, and the number of sportsbooks with data for each game. Use this first to discover which games are available.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_game_odds",
    description:
      "Get all odds records for a specific game across all sportsbooks. Accepts a game_id (e.g. 'nba_20260320_lal_bos') or a team name (e.g. 'Lakers', 'Boston Celtics'). Returns every sportsbook's spread, moneyline, and total lines for that game.",
    input_schema: {
      type: "object" as const,
      properties: {
        game_id: {
          type: "string",
          description:
            "The game_id (e.g. 'nba_20260320_lal_bos') or a team name (e.g. 'Lakers', 'Celtics')",
        },
      },
      required: ["game_id"],
    },
  },
  {
    name: "get_sportsbook_odds",
    description:
      "Get all odds records for a specific sportsbook across all games. Returns every game line offered by that book.",
    input_schema: {
      type: "object" as const,
      properties: {
        sportsbook: {
          type: "string",
          description:
            "Sportsbook name (e.g. 'DraftKings', 'FanDuel', 'Pinnacle', 'BetMGM', 'Caesars', 'PointsBet', 'bet365', 'BetRivers')",
        },
      },
      required: ["sportsbook"],
    },
  },
  {
    name: "get_market_odds",
    description:
      "Get odds for a specific market type (spread, moneyline, or total) across all games and all sportsbooks. Optionally filter to a single game.",
    input_schema: {
      type: "object" as const,
      properties: {
        market: {
          type: "string",
          enum: ["spread", "moneyline", "total"],
          description: "The market type to retrieve",
        },
        game_id: {
          type: "string",
          description:
            "Optional: game_id or team name to filter to a single game",
        },
      },
      required: ["market"],
    },
  },
  {
    name: "compare_sportsbooks_for_game",
    description:
      "Side-by-side comparison of all sportsbook odds for a specific game. Returns a structured table showing each book's spread, moneyline, and total for easy comparison.",
    input_schema: {
      type: "object" as const,
      properties: {
        game_id: {
          type: "string",
          description: "The game_id or team name",
        },
      },
      required: ["game_id"],
    },
  },
  {
    name: "find_stale_lines",
    description:
      "Find sportsbook lines that are potentially stale — significantly older than other books' updates for the same game. Returns records where last_updated is 2+ hours behind the freshest update.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "find_best_odds",
    description:
      "For a given game, find the best available odds (highest payout) on each side of each market across all sportsbooks. Shows which book to bet at for the best price.",
    input_schema: {
      type: "object" as const,
      properties: {
        game_id: {
          type: "string",
          description: "The game_id or team name",
        },
      },
      required: ["game_id"],
    },
  },
  {
    name: "get_line_for_game_and_book",
    description:
      "Get the exact odds from a specific sportsbook for a specific game. Use when the user asks something like 'What does DraftKings have for the Lakers game?'",
    input_schema: {
      type: "object" as const,
      properties: {
        game_id: {
          type: "string",
          description: "The game_id or team name",
        },
        sportsbook: {
          type: "string",
          description: "The sportsbook name",
        },
      },
      required: ["game_id", "sportsbook"],
    },
  },
];

// ── Alias resolution ────────────────────────────────────────────────────────

const TEAM_ALIASES: Record<string, string[]> = {
  "Boston Celtics": ["celtics", "boston", "bos"],
  "Los Angeles Lakers": ["lakers", "la lakers", "lal", "los angeles lakers"],
  "Golden State Warriors": ["warriors", "golden state", "gsw", "gs warriors"],
  "Milwaukee Bucks": ["bucks", "milwaukee", "mil"],
  "Philadelphia 76ers": ["76ers", "sixers", "philly", "philadelphia", "phi"],
  "Denver Nuggets": ["nuggets", "denver", "den"],
  "Phoenix Suns": ["suns", "phoenix", "phx"],
  "Miami Heat": ["heat", "miami", "mia"],
  "New York Knicks": ["knicks", "new york", "nyk", "ny knicks"],
  "Dallas Mavericks": ["mavericks", "mavs", "dallas", "dal"],
  "Cleveland Cavaliers": ["cavaliers", "cavs", "cleveland", "cle"],
  "Minnesota Timberwolves": ["timberwolves", "wolves", "minnesota", "min"],
  "Oklahoma City Thunder": ["thunder", "okc", "oklahoma city", "oklahoma"],
  "Sacramento Kings": ["kings", "sacramento", "sac"],
  "Indiana Pacers": ["pacers", "indiana", "ind"],
  "New Orleans Pelicans": ["pelicans", "new orleans", "nop", "pels"],
  "Atlanta Hawks": ["hawks", "atlanta", "atl"],
  "Chicago Bulls": ["bulls", "chicago", "chi"],
  "Toronto Raptors": ["raptors", "toronto", "tor"],
  "Brooklyn Nets": ["nets", "brooklyn", "bkn"],
  "Los Angeles Clippers": ["clippers", "la clippers", "lac"],
  "Houston Rockets": ["rockets", "houston", "hou"],
  "Memphis Grizzlies": ["grizzlies", "memphis", "mem"],
  "San Antonio Spurs": ["spurs", "san antonio", "sas"],
  "Portland Trail Blazers": ["blazers", "portland", "por", "trail blazers"],
  "Utah Jazz": ["jazz", "utah", "uta"],
  "Washington Wizards": ["wizards", "washington", "was"],
  "Orlando Magic": ["magic", "orlando", "orl"],
  "Charlotte Hornets": ["hornets", "charlotte", "cha"],
  "Detroit Pistons": ["pistons", "detroit", "det"],
};

const SPORTSBOOK_ALIASES: Record<string, string[]> = {
  DraftKings: ["draftkings", "dk", "draft kings"],
  FanDuel: ["fanduel", "fd", "fan duel"],
  BetMGM: ["betmgm", "mgm", "bet mgm"],
  Caesars: ["caesars", "czr", "caesars sportsbook", "william hill"],
  PointsBet: ["pointsbet", "pb", "points bet"],
  bet365: ["bet365", "b365", "365"],
  BetRivers: ["betrivers", "rivers", "bet rivers", "sugarhouse"],
  Pinnacle: ["pinnacle", "pin", "pinnacle sports"],
};

function resolveTeam(input: string): string | null {
  const q = input.toLowerCase().trim();
  for (const [fullName, aliases] of Object.entries(TEAM_ALIASES)) {
    if (q === fullName.toLowerCase() || aliases.some((a) => q.includes(a))) {
      return fullName;
    }
  }
  return null;
}

function resolveSportsbook(input: string): string | null {
  const q = input.toLowerCase().trim();
  for (const [fullName, aliases] of Object.entries(SPORTSBOOK_ALIASES)) {
    if (q === fullName.toLowerCase() || aliases.some((a) => q === a)) {
      return fullName;
    }
  }
  return null;
}

function resolveGameRecords(gameIdOrTeam: string): OddsRecord[] {
  const data = loadOddsData();
  const direct = data.odds.filter((r) => r.game_id === gameIdOrTeam);
  if (direct.length > 0) return direct;

  const team = resolveTeam(gameIdOrTeam);
  if (!team) return [];
  return data.odds.filter(
    (r) =>
      r.home_team.toLowerCase() === team.toLowerCase() ||
      r.away_team.toLowerCase() === team.toLowerCase()
  );
}

// ── Tool implementations ────────────────────────────────────────────────────

function listGames(): string {
  const data = loadOddsData();
  const gameMap = new Map<
    string,
    { home: string; away: string; time: string; books: Set<string> }
  >();

  for (const r of data.odds) {
    let entry = gameMap.get(r.game_id);
    if (!entry) {
      entry = {
        home: r.home_team,
        away: r.away_team,
        time: r.commence_time,
        books: new Set(),
      };
      gameMap.set(r.game_id, entry);
    }
    entry.books.add(r.sportsbook);
  }

  const games = Array.from(gameMap.entries()).map(([id, g]) => ({
    game_id: id,
    home_team: g.home,
    away_team: g.away,
    commence_time: g.time,
    sportsbooks_count: g.books.size,
  }));

  return JSON.stringify(games, null, 2);
}

function getGameOdds(gameId: string): string {
  const records = resolveGameRecords(gameId);
  if (records.length === 0) {
    return JSON.stringify({ error: `No game found for "${gameId}". Use list_games to see available games.` });
  }
  return JSON.stringify(records, null, 2);
}

function getSportsbookOdds(sportsbook: string): string {
  const resolved = resolveSportsbook(sportsbook) ?? sportsbook;
  const data = loadOddsData();
  const records = data.odds.filter(
    (r) => r.sportsbook.toLowerCase() === resolved.toLowerCase()
  );
  if (records.length === 0) {
    return JSON.stringify({ error: `No records found for sportsbook "${sportsbook}". Available: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, bet365, BetRivers, Pinnacle` });
  }
  return JSON.stringify(records, null, 2);
}

function getMarketOdds(market: string, gameId?: string): string {
  let records = gameId ? resolveGameRecords(gameId) : loadOddsData().odds;
  if (records.length === 0) {
    return JSON.stringify({ error: `No game found for "${gameId}".` });
  }

  const extracted = records.map((r) => {
    const base = {
      game_id: r.game_id,
      home_team: r.home_team,
      away_team: r.away_team,
      sportsbook: r.sportsbook,
    };
    if (market === "spread") return { ...base, spread: r.markets.spread };
    if (market === "moneyline") return { ...base, moneyline: r.markets.moneyline };
    return { ...base, total: r.markets.total };
  });

  return JSON.stringify(extracted, null, 2);
}

function compareSportsbooksForGame(gameId: string): string {
  const records = resolveGameRecords(gameId);
  if (records.length === 0) {
    return JSON.stringify({ error: `No game found for "${gameId}".` });
  }

  const comparison = records.map((r) => ({
    sportsbook: r.sportsbook,
    spread: {
      home: `${r.markets.spread.home_line} (${formatAmerican(r.markets.spread.home_odds)})`,
      away: `${r.markets.spread.away_line} (${formatAmerican(r.markets.spread.away_odds)})`,
    },
    moneyline: {
      home: formatAmerican(r.markets.moneyline.home_odds),
      away: formatAmerican(r.markets.moneyline.away_odds),
    },
    total: {
      line: r.markets.total.line,
      over: formatAmerican(r.markets.total.over_odds),
      under: formatAmerican(r.markets.total.under_odds),
    },
    last_updated: r.last_updated,
  }));

  const first = records[0];
  return JSON.stringify(
    {
      game: `${first.away_team} @ ${first.home_team}`,
      game_id: first.game_id,
      books: comparison,
    },
    null,
    2
  );
}

function findStaleLines(): string {
  const data = loadOddsData();
  const byGame = new Map<string, OddsRecord[]>();
  for (const r of data.odds) {
    const existing = byGame.get(r.game_id) ?? [];
    existing.push(r);
    byGame.set(r.game_id, existing);
  }

  const stale: Array<{
    game_id: string;
    sportsbook: string;
    last_updated: string;
    hours_behind: number;
  }> = [];

  for (const [gameId, gameRecords] of byGame.entries()) {
    const timestamps = gameRecords.map((r) =>
      new Date(r.last_updated).getTime()
    );
    const maxTime = Math.max(...timestamps);

    for (const r of gameRecords) {
      const hoursBehind =
        (maxTime - new Date(r.last_updated).getTime()) / (1000 * 60 * 60);
      if (hoursBehind >= 2) {
        stale.push({
          game_id: gameId,
          sportsbook: r.sportsbook,
          last_updated: r.last_updated,
          hours_behind: Math.round(hoursBehind * 10) / 10,
        });
      }
    }
  }

  if (stale.length === 0) {
    return JSON.stringify({ message: "No stale lines found. All sportsbooks are within 2 hours of the freshest update." });
  }

  return JSON.stringify(stale, null, 2);
}

function findBestOddsForGame(gameId: string): string {
  const records = resolveGameRecords(gameId);
  if (records.length === 0) {
    return JSON.stringify({ error: `No game found for "${gameId}".` });
  }

  const first = records[0];

  function best(
    entries: Array<{ sportsbook: string; odds: number; line?: number }>
  ) {
    return entries.reduce((a, b) => {
      const aProb = a.odds < 0 ? Math.abs(a.odds) / (Math.abs(a.odds) + 100) : 100 / (a.odds + 100);
      const bProb = b.odds < 0 ? Math.abs(b.odds) / (Math.abs(b.odds) + 100) : 100 / (b.odds + 100);
      return bProb < aProb ? b : a;
    });
  }

  const result = {
    game: `${first.away_team} @ ${first.home_team}`,
    game_id: first.game_id,
    best_spread_home: best(
      records.map((r) => ({
        sportsbook: r.sportsbook,
        odds: r.markets.spread.home_odds,
        line: r.markets.spread.home_line,
      }))
    ),
    best_spread_away: best(
      records.map((r) => ({
        sportsbook: r.sportsbook,
        odds: r.markets.spread.away_odds,
        line: r.markets.spread.away_line,
      }))
    ),
    best_moneyline_home: best(
      records.map((r) => ({
        sportsbook: r.sportsbook,
        odds: r.markets.moneyline.home_odds,
      }))
    ),
    best_moneyline_away: best(
      records.map((r) => ({
        sportsbook: r.sportsbook,
        odds: r.markets.moneyline.away_odds,
      }))
    ),
    best_total_over: best(
      records.map((r) => ({
        sportsbook: r.sportsbook,
        odds: r.markets.total.over_odds,
        line: r.markets.total.line,
      }))
    ),
    best_total_under: best(
      records.map((r) => ({
        sportsbook: r.sportsbook,
        odds: r.markets.total.under_odds,
        line: r.markets.total.line,
      }))
    ),
  };

  return JSON.stringify(result, null, 2);
}

function getLineForGameAndBook(gameId: string, sportsbook: string): string {
  const records = resolveGameRecords(gameId);
  const resolved = resolveSportsbook(sportsbook) ?? sportsbook;
  const match = records.find(
    (r) => r.sportsbook.toLowerCase() === resolved.toLowerCase()
  );

  if (!match) {
    const available = records.map((r) => r.sportsbook);
    return JSON.stringify({
      error: `No line found for "${sportsbook}" on this game.`,
      available_sportsbooks: available,
    });
  }

  return JSON.stringify(match, null, 2);
}

// ── Tool executor ───────────────────────────────────────────────────────────

export function executeTool(
  name: string,
  input: Record<string, unknown>
): string {
  switch (name) {
    case "list_games":
      return listGames();
    case "get_game_odds":
      return getGameOdds(input.game_id as string);
    case "get_sportsbook_odds":
      return getSportsbookOdds(input.sportsbook as string);
    case "get_market_odds":
      return getMarketOdds(
        input.market as string,
        input.game_id as string | undefined
      );
    case "compare_sportsbooks_for_game":
      return compareSportsbooksForGame(input.game_id as string);
    case "find_stale_lines":
      return findStaleLines();
    case "find_best_odds":
      return findBestOddsForGame(input.game_id as string);
    case "get_line_for_game_and_book":
      return getLineForGameAndBook(
        input.game_id as string,
        input.sportsbook as string
      );
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function formatAmerican(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}
