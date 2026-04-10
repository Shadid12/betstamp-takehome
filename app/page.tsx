import data from "@/data/data.json";
import OddsTable from "./odds-table";

export default function Home() {
  const odds = data.odds;

  const gameIds = Array.from(new Set(odds.map((o) => o.game_id)));

  const games = gameIds.map((gameId) => {
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

      <main className="max-w-7xl mx-auto w-full space-y-4">
        <OddsTable games={games} />
      </main>
    </div>
  );
}
