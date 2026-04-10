"use client";

import { useState, useMemo } from "react";

type OddsRecord = {
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
    moneyline: { home_odds: number; away_odds: number };
    total: { line: number; over_odds: number; under_odds: number };
  };
  last_updated: string;
};

type Game = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  records: OddsRecord[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export default function OddsTable({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return games;

    return games
      .map((game) => {
        const gameMatch =
          game.homeTeam.toLowerCase().includes(q) ||
          game.awayTeam.toLowerCase().includes(q);

        const matchingRecords = game.records.filter(
          (r) =>
            gameMatch || r.sportsbook.toLowerCase().includes(q)
        );

        if (matchingRecords.length === 0) return null;

        return gameMatch
          ? game
          : { ...game, records: matchingRecords };
      })
      .filter(Boolean) as Game[];
  }, [games, query]);

  const totalRows = filtered.reduce((sum, g) => sum + g.records.length, 0);

  return (
    <>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by team or sportsbook..."
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No results for &ldquo;{query}&rdquo;
          </div>
        ) : (
          <>
            {query && (
              <div className="border-b border-zinc-100 px-5 py-2 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                {totalRows} {totalRows === 1 ? "row" : "rows"} across{" "}
                {filtered.length} {filtered.length === 1 ? "game" : "games"}
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th className="px-5 py-3">Game</th>
                  <th className="px-5 py-3">Sportsbook</th>
                  <th className="px-5 py-3 text-center" colSpan={2}>
                    Spread
                  </th>
                  <th className="px-5 py-3 text-center" colSpan={2}>
                    Moneyline
                  </th>
                  <th className="px-5 py-3 text-center" colSpan={2}>
                    Total
                  </th>
                  <th className="px-5 py-3 text-right">Updated</th>
                </tr>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500">
                  <th className="px-5 pb-2" />
                  <th className="px-5 pb-2" />
                  <th className="px-3 pb-2 text-center font-normal">Home</th>
                  <th className="px-3 pb-2 text-center font-normal">Away</th>
                  <th className="px-3 pb-2 text-center font-normal">Home</th>
                  <th className="px-3 pb-2 text-center font-normal">Away</th>
                  <th className="px-3 pb-2 text-center font-normal">Over</th>
                  <th className="px-3 pb-2 text-center font-normal">Under</th>
                  <th className="px-5 pb-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((game) =>
                  game.records.map((r, i) => (
                    <tr
                      key={`${game.gameId}-${r.sportsbook}`}
                      className={`${
                        i === 0
                          ? "border-t-2 border-zinc-200 dark:border-zinc-700"
                          : "border-t border-zinc-50 dark:border-zinc-800/50"
                      } ${
                        i % 2 === 0
                          ? "bg-white dark:bg-zinc-900"
                          : "bg-zinc-50/50 dark:bg-zinc-800/20"
                      }`}
                    >
                      {i === 0 ? (
                        <td
                          rowSpan={game.records.length}
                          className="px-5 py-3 align-top font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap border-r border-zinc-100 dark:border-zinc-800"
                        >
                          <div>{game.awayTeam}</div>
                          <div className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
                            @
                          </div>
                          <div>{game.homeTeam}</div>
                          <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 font-normal">
                            {formatDate(game.commenceTime)}
                          </div>
                        </td>
                      ) : null}
                      <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {r.sportsbook}
                      </td>
                      <td className="px-3 py-3 text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        <span className="font-mono">
                          {r.markets.spread.home_line > 0 ? "+" : ""}
                          {r.markets.spread.home_line}
                        </span>
                        <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                          ({formatOdds(r.markets.spread.home_odds)})
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        <span className="font-mono">
                          {r.markets.spread.away_line > 0 ? "+" : ""}
                          {r.markets.spread.away_line}
                        </span>
                        <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                          ({formatOdds(r.markets.spread.away_odds)})
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {formatOdds(r.markets.moneyline.home_odds)}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {formatOdds(r.markets.moneyline.away_odds)}
                      </td>
                      <td className="px-3 py-3 text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        <span className="font-mono">
                          {r.markets.total.line}
                        </span>
                        <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                          ({formatOdds(r.markets.total.over_odds)})
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        <span className="font-mono">
                          {r.markets.total.line}
                        </span>
                        <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                          ({formatOdds(r.markets.total.under_odds)})
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                        {formatDate(r.last_updated)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
