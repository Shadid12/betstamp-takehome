"use client";

import { useState } from "react";

type AnomalyDetail = {
  game_id: string;
  sportsbook: string;
  type: "stale_line" | "outlier_price" | "potential_error";
  severity: "low" | "medium" | "high";
  market: string;
  description: string;
  details: Record<string, unknown>;
};

type DetectionResult = {
  anomalies: AnomalyDetail[];
  meta: {
    model: string;
    games_analyzed: number;
    records_analyzed: number;
    detected_at: string;
  };
};

const SEVERITY_STYLES = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  medium:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
} as const;

const TYPE_LABELS = {
  stale_line: "Stale Line",
  outlier_price: "Outlier Price",
  potential_error: "Potential Error",
} as const;

export default function AnomalyButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/detect-anomalies", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Request failed (${res.status})`);
      }
      const data: DetectionResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <button
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:active:bg-indigo-600"
        >
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          )}
          {loading ? "Analyzing…" : "Detect Anomalies"}
        </button>

        {result && (
          <button
            onClick={() => setResult(null)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition"
          >
            Clear results
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Anomaly Report
            </h2>
            <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
              <span>
                {result.meta.games_analyzed} games &middot;{" "}
                {result.meta.records_analyzed} records analyzed
              </span>
              <span>{result.anomalies.length} anomalies found</span>
            </div>
          </div>

          {result.anomalies.length === 0 ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-8 text-center dark:border-green-800 dark:bg-green-950">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                No anomalies detected — all odds look clean.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.anomalies.map((a, i) => (
                <div
                  key={`${a.game_id}-${a.sportsbook}-${a.market}-${i}`}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[a.severity]}`}
                    >
                      {a.severity.toUpperCase()}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {TYPE_LABELS[a.type]}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {a.market}
                    </span>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {a.sportsbook}{" "}
                      <span className="font-normal text-zinc-400 dark:text-zinc-500">
                        — {a.game_id}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {a.description}
                    </p>
                  </div>

                  {a.details && Object.keys(a.details).length > 0 && (
                    <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                        {Object.entries(a.details).map(([key, val]) => (
                          <div key={key} className="flex gap-1.5">
                            <dt className="text-zinc-400 dark:text-zinc-500">
                              {key}:
                            </dt>
                            <dd className="font-mono text-zinc-700 dark:text-zinc-300">
                              {typeof val === "object"
                                ? JSON.stringify(val)
                                : String(val)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
