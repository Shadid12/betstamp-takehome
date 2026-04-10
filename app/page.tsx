import data from "@/data/data.json";

type OddsRecord = (typeof data.odds)[number];

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

export default function Home() {
  const odds = data.odds;

  const gameIds = Array.from(new Set(odds.map((o) => o.game_id)));

  const grouped = gameIds.map((gameId) => {
    const records = odds.filter((o) => o.game_id === gameId);
    const first = records[0];
    return {
      gameId,
      homeTeam: first.home_team,
      awayTeam: first.away_team,
      commenceTime: first.commence_time,
      records,
    };
  });

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-zinc-950 px-4 py-8 sm:px-8">
      <header className="mb-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          NBA Odds Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {data.description}
        </p>
      </header>

      <main className="max-w-7xl mx-auto w-full">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
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
              {grouped.map((game) =>
                game.records.map((r: OddsRecord, i: number) => (
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
        </div>
      </main>
    </div>
  );
}
