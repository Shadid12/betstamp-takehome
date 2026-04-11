"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type AnomalyDetail = {
  game_id: string;
  sportsbook: string;
  type: "stale_line" | "outlier_price" | "potential_error";
  severity: "low" | "medium" | "high";
  market: string;
  description: string;
  details: Record<string, unknown>;
};

type BestOddsSide = {
  sportsbook: string;
  odds: number;
  line?: number;
};

type GameAnalysis = {
  game_id: string;
  home_team: string;
  away_team: string;
  best_odds: {
    spread: { home: BestOddsSide; away: BestOddsSide };
    moneyline: { home: BestOddsSide; away: BestOddsSide };
    total: { over: BestOddsSide; under: BestOddsSide };
  };
  vig_by_book: {
    sportsbook: string;
    spread_vig: number;
    moneyline_vig: number;
    total_vig: number;
  }[];
  sharpest_book: string;
  value_opportunities: {
    market: string;
    side: string;
    sportsbook: string;
    odds: number;
    consensus_odds: number;
    edge_description: string;
  }[];
};

type ArbitrageOpportunity = {
  game_id: string;
  market: string;
  leg1: { side: string; sportsbook: string; odds: number };
  leg2: { side: string; sportsbook: string; odds: number };
  combined_implied_probability: number;
  profit_margin_pct: number;
  description: string;
};

type SportsbookRanking = {
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

type TopValuePlay = {
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

type GameSnapshot = {
  game_id: string;
  headline: string;
};

type DailyBriefing = {
  market_overview: string;
  anomalies: AnomalyDetail[];
  top_value_plays: TopValuePlay[];
  arbitrage_opportunities: ArbitrageOpportunity[];
  sportsbook_rankings: SportsbookRanking[];
  game_snapshots: GameSnapshot[];
  analyst_notes: string[];
};

type Analysis = {
  games: GameAnalysis[];
  arbitrage_opportunities: ArbitrageOpportunity[];
  sportsbook_rankings: SportsbookRanking[];
  top_value_plays: TopValuePlay[];
};

type DetectionResult = {
  daily_briefing: DailyBriefing;
  analysis: Analysis;
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

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatVig(vig: number) {
  return `${vig.toFixed(1)}%`;
}

type ToolEvent = {
  type: "tool_call";
  tool: string;
  label: string;
  input: Record<string, unknown>;
  done?: boolean;
  records?: number | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolEvent[];
};

type TabId = "overview" | "anomalies" | "value" | "rankings" | "best-odds" | "chat";

export default function AnomalyButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setResult(null);
    setChatMessages([]);

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

  const briefing = result?.daily_briefing;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Market Overview" },
    {
      id: "anomalies",
      label: "Anomalies",
      count: briefing?.anomalies.length,
    },
    {
      id: "value",
      label: "Top Value",
      count: briefing
        ? briefing.top_value_plays.length + briefing.arbitrage_opportunities.length
        : undefined,
    },
    {
      id: "rankings",
      label: "Book Rankings",
      count: briefing?.sportsbook_rankings.length,
    },
    {
      id: "best-odds",
      label: "Best Odds & Vig",
      count: result?.analysis.games.length,
    },
    {
      id: "chat",
      label: "Ask AI",
      count: chatMessages.length > 0 ? chatMessages.filter(m => m.role === "user").length : undefined,
    },
  ];

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
          {loading ? "Analyzing…" : "Run AI Odds Agent"}
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

      {result && briefing && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
              <span>
                {result.meta.games_analyzed} games &middot;{" "}
                {result.meta.records_analyzed} records analyzed
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                      activeTab === tab.id
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                        : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <OverviewPanel briefing={briefing} />
          )}
          {activeTab === "anomalies" && (
            <AnomaliesPanel anomalies={briefing.anomalies} />
          )}
          {activeTab === "value" && (
            <TopValuePanel
              topPlays={briefing.top_value_plays}
              arbOpps={briefing.arbitrage_opportunities}
            />
          )}
          {activeTab === "rankings" && (
            <RankingsPanel rankings={briefing.sportsbook_rankings} />
          )}
          {activeTab === "best-odds" && (
            <BestOddsPanel games={result.analysis.games} />
          )}
          {activeTab === "chat" && (
            <ChatPanel
              messages={chatMessages}
              setMessages={setChatMessages}
              context={{
                anomalies: briefing.anomalies,
                analysis: result.analysis,
                briefing: briefing.market_overview,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function OverviewPanel({ briefing }: { briefing: DailyBriefing }) {
  const highSeverity = briefing.anomalies.filter(a => a.severity === "high");
  const medSeverity = briefing.anomalies.filter(a => a.severity === "medium");

  return (
    <div className="space-y-4">
      {/* Market Overview */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800 flex items-center gap-2">
          <svg className="h-4 w-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Market Overview
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {briefing.market_overview}
          </p>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Anomalies"
          value={briefing.anomalies.length}
          accent={highSeverity.length > 0 ? "red" : medSeverity.length > 0 ? "amber" : "green"}
          sub={highSeverity.length > 0 ? `${highSeverity.length} high severity` : "All clear"}
        />
        <StatCard
          label="Value Plays"
          value={briefing.top_value_plays.length}
          accent="emerald"
          sub={briefing.top_value_plays[0] ? `Best: ${briefing.top_value_plays[0].edge_cents.toFixed(1)}¢ edge` : "None found"}
        />
        <StatCard
          label="Arb Opps"
          value={briefing.arbitrage_opportunities.length}
          accent={briefing.arbitrage_opportunities.length > 0 ? "amber" : "zinc"}
          sub={briefing.arbitrage_opportunities[0] ? `+${briefing.arbitrage_opportunities[0].profit_margin_pct.toFixed(2)}% profit` : "None detected"}
        />
        <StatCard
          label="Sharpest Book"
          value={briefing.sportsbook_rankings[0]?.sportsbook ?? "—"}
          accent="indigo"
          sub={briefing.sportsbook_rankings[0] ? `${briefing.sportsbook_rankings[0].avg_combined_vig.toFixed(1)}% avg vig` : ""}
          isText
        />
      </div>

      {/* Game Snapshots */}
      {briefing.game_snapshots.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Game-by-Game Snapshot
            </h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {briefing.game_snapshots.map((snap) => (
              <div key={snap.game_id} className="px-5 py-3">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                  {snap.game_id}
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {snap.headline}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyst Notes */}
      {briefing.analyst_notes.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Analyst Notes
            </h3>
          </div>
          <ul className="px-5 py-4 space-y-2">
            {briefing.analyst_notes.map((note, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="text-indigo-400 dark:text-indigo-500 mt-0.5 shrink-0">&#8226;</span>
                <span className="leading-relaxed">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  sub,
  isText,
}: {
  label: string;
  value: string | number;
  accent: string;
  sub: string;
  isText?: boolean;
}) {
  const accentColors: Record<string, string> = {
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    green: "text-emerald-600 dark:text-emerald-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
    zinc: "text-zinc-500 dark:text-zinc-400",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 ${isText ? "text-lg" : "text-2xl"} font-bold ${accentColors[accent] ?? accentColors.zinc}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 truncate">
        {sub}
      </p>
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++}>{renderInline(line.slice(3))}</h2>
      );
      i++;
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++}>{renderInline(line.slice(4))}</h3>
      );
      i++;
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={key++}>{renderInline(line.slice(2))}</h1>
      );
      i++;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("* "))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={key++}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    } else if (line.trim() === "") {
      i++;
    } else {
      let paragraph = line;
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !lines[i].startsWith("#") &&
        !lines[i].startsWith("- ") &&
        !lines[i].startsWith("* ") &&
        !/^\d+\.\s/.test(lines[i])
      ) {
        paragraph += " " + lines[i];
        i++;
      }
      elements.push(
        <p key={key++}>{renderInline(paragraph)}</p>
      );
    }
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4]) {
      parts.push(<code key={key++}>{match[4]}</code>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}

function ToolCallIndicator({ tools, isLive }: { tools: ToolEvent[]; isLive: boolean }) {
  if (tools.length === 0) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1.5">
        {tools.map((tool, i) => (
          <div
            key={`${tool.tool}-${i}`}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
              tool.done
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40"
                : "border-indigo-200 bg-indigo-50 dark:border-indigo-800/60 dark:bg-indigo-950/40"
            }`}
          >
            {tool.done ? (
              <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span className={`font-medium ${tool.done ? "text-emerald-700 dark:text-emerald-300" : "text-indigo-700 dark:text-indigo-300"}`}>
              {tool.label}
            </span>
            {tool.input && Object.keys(tool.input).length > 0 && (
              <span className="text-zinc-400 dark:text-zinc-500">
                {formatToolInput(tool.input)}
              </span>
            )}
            {tool.done && tool.records != null && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                {tool.records} {tool.records === 1 ? "result" : "results"}
              </span>
            )}
          </div>
        ))}
        {isLive && tools.length > 0 && tools.every(t => t.done) && (
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-zinc-400 dark:text-zinc-500">
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing results...
          </div>
        )}
      </div>
    </div>
  );
}

function formatToolInput(input: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [, val] of Object.entries(input)) {
    if (typeof val === "string") parts.push(val);
  }
  return parts.length > 0 ? `(${parts.join(", ")})` : "";
}

function ChatPanel({
  messages,
  setMessages,
  context,
}: {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  context: { anomalies: unknown; analysis: unknown; briefing: string };
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [liveTools, setLiveTools] = useState<ToolEvent[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, liveTools, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setSending(true);
    setLiveTools([]);
    setStatusText(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      const collectedTools: ToolEvent[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "status") {
              setStatusText(event.message);
            } else if (event.type === "tool_call") {
              const toolEvent: ToolEvent = {
                type: "tool_call",
                tool: event.tool,
                label: event.label,
                input: event.input,
                done: false,
              };
              collectedTools.push(toolEvent);
              setLiveTools([...collectedTools]);
              setStatusText(null);
            } else if (event.type === "tool_result") {
              const match = collectedTools.find(
                (t) => t.tool === event.tool && !t.done
              );
              if (match) {
                match.done = true;
                match.records = event.records;
              }
              setLiveTools([...collectedTools]);
            } else if (event.type === "message") {
              setLiveTools([]);
              setStatusText(null);
              const finalTools = collectedTools.length > 0
                ? collectedTools.map(t => ({ ...t, done: true }))
                : undefined;
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: event.content,
                  toolCalls: finalTools,
                },
              ]);
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      setLiveTools([]);
      setStatusText(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}. Please try again.`,
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const suggestions = [
    "Which game has the best value bet right now?",
    "Break down the Celtics vs Lakers odds for me",
    "Which sportsbooks should I avoid today and why?",
    "Explain the BetMGM moneyline anomaly in detail",
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden flex flex-col" style={{ minHeight: "500px" }}>
      <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800 flex items-center gap-2">
        <svg
          className="h-4 w-4 text-indigo-500 dark:text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Ask the AI Analyst
        </h3>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && !sending ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-4">
              Ask follow-up questions about the analysis
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                  className="text-left rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="space-y-2">
              {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                <ToolCallIndicator tools={msg.toolCalls} isLive={false} />
              )}
              <div
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1.5 prose-li:leading-relaxed prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:before:content-none prose-code:after:content-none">
                      <MarkdownRenderer content={msg.content} />
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {sending && (
          <>
            {statusText && liveTools.length === 0 && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                  <svg className="h-3.5 w-3.5 animate-spin text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>
                </div>
              </div>
            )}
            {liveTools.length > 0 && (
              <ToolCallIndicator tools={liveTools} isLive={true} />
            )}
            {liveTools.length === 0 && !statusText && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce dark:bg-zinc-500" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce dark:bg-zinc-500" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce dark:bg-zinc-500" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            rows={1}
            disabled={sending}
            className="flex-1 resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 p-2.5 text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
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
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function AnomaliesPanel({ anomalies }: { anomalies: AnomalyDetail[] }) {
  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-8 text-center dark:border-green-800 dark:bg-green-950">
        <p className="text-sm font-medium text-green-700 dark:text-green-300">
          No anomalies detected — all odds look clean.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {anomalies.map((a, i) => (
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
  );
}

function BestOddsPanel({ games }: { games: GameAnalysis[] }) {
  return (
    <div className="space-y-6">
      {games.map((game) => (
        <div
          key={game.game_id}
          className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden"
        >
          <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {game.away_team} @ {game.home_team}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Sharpest book:{" "}
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                {game.sharpest_book}
              </span>
            </p>
          </div>

          {/* Best available odds */}
          <div className="px-5 py-3 border-b border-zinc-50 dark:border-zinc-800/50">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
              Best Available Odds
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <BestOddsMarketCard
                label="Spread"
                sides={[
                  {
                    label: "Home",
                    ...game.best_odds.spread.home,
                    showLine: true,
                  },
                  {
                    label: "Away",
                    ...game.best_odds.spread.away,
                    showLine: true,
                  },
                ]}
              />
              <BestOddsMarketCard
                label="Moneyline"
                sides={[
                  {
                    label: "Home",
                    ...game.best_odds.moneyline.home,
                    showLine: false,
                  },
                  {
                    label: "Away",
                    ...game.best_odds.moneyline.away,
                    showLine: false,
                  },
                ]}
              />
              <BestOddsMarketCard
                label="Total"
                sides={[
                  {
                    label: "Over",
                    ...game.best_odds.total.over,
                    showLine: true,
                  },
                  {
                    label: "Under",
                    ...game.best_odds.total.under,
                    showLine: true,
                  },
                ]}
              />
            </div>
          </div>

          {/* Vig table */}
          <div className="px-5 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
              Vig by Sportsbook
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-zinc-400 dark:text-zinc-500">
                    <th className="pb-1.5 pr-4 font-medium">Book</th>
                    <th className="pb-1.5 pr-4 font-medium text-right">
                      Spread
                    </th>
                    <th className="pb-1.5 pr-4 font-medium text-right">
                      Moneyline
                    </th>
                    <th className="pb-1.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {game.vig_by_book
                    .slice()
                    .sort(
                      (a, b) =>
                        a.spread_vig +
                        a.moneyline_vig +
                        a.total_vig -
                        (b.spread_vig + b.moneyline_vig + b.total_vig)
                    )
                    .map((row) => {
                      const isSharpest =
                        row.sportsbook === game.sharpest_book;
                      return (
                        <tr
                          key={row.sportsbook}
                          className={
                            isSharpest
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-zinc-700 dark:text-zinc-300"
                          }
                        >
                          <td className="py-1 pr-4 font-medium whitespace-nowrap">
                            {row.sportsbook}
                            {isSharpest && (
                              <span className="ml-1.5 text-[10px] text-indigo-500 dark:text-indigo-400">
                                SHARPEST
                              </span>
                            )}
                          </td>
                          <td className="py-1 pr-4 text-right font-mono">
                            {formatVig(row.spread_vig)}
                          </td>
                          <td className="py-1 pr-4 text-right font-mono">
                            {formatVig(row.moneyline_vig)}
                          </td>
                          <td className="py-1 text-right font-mono">
                            {formatVig(row.total_vig)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BestOddsMarketCard({
  label,
  sides,
}: {
  label: string;
  sides: {
    label: string;
    sportsbook: string;
    odds: number;
    line?: number;
    showLine: boolean;
  }[];
}) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/50">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
        {label}
      </p>
      {sides.map((s) => (
        <div
          key={s.label}
          className="flex items-center justify-between py-0.5"
        >
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {s.label}
          </span>
          <span className="text-xs">
            {s.showLine && s.line !== undefined && (
              <span className="font-mono text-zinc-600 dark:text-zinc-300 mr-1">
                {s.line > 0 ? `+${s.line}` : s.line}
              </span>
            )}
            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              {formatOdds(s.odds)}
            </span>
            <span className="ml-1 text-zinc-400 dark:text-zinc-500">
              @ {s.sportsbook}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function TopValuePanel({
  topPlays,
  arbOpps,
}: {
  topPlays: TopValuePlay[];
  arbOpps: ArbitrageOpportunity[];
}) {
  return (
    <div className="space-y-6">
      {/* Top value plays */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Top Value Plays
        </h3>
        {topPlays.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              No significant value opportunities found.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topPlays.map((v) => (
              <div
                key={`${v.game_id}-${v.market}-${v.side}-${v.rank}`}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                    #{v.rank}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {v.edge_cents.toFixed(1)}¢ edge
                  </span>
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {v.market}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {v.side}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {v.sportsbook}{" "}
                  <span className="font-normal text-zinc-400 dark:text-zinc-500">
                    — {v.away_team} @ {v.home_team}
                  </span>
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {v.edge_description}
                </p>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="text-zinc-400 dark:text-zinc-500">
                    Offered:{" "}
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatOdds(v.odds)}
                    </span>
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    Consensus:{" "}
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">
                      {formatOdds(v.consensus_odds)}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arbitrage */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Arbitrage Opportunities
        </h3>
        {arbOpps.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              No arbitrage opportunities detected.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {arbOpps.map((a, i) => (
              <div
                key={`arb-${a.game_id}-${a.market}-${i}`}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950"
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                    ARB
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    +{a.profit_margin_pct.toFixed(2)}% profit
                  </span>
                </div>
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  {a.description}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-amber-100/50 px-3 py-2 dark:bg-amber-900/30">
                    <p className="text-amber-600 dark:text-amber-400">Leg 1</p>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      {a.leg1.side} {formatOdds(a.leg1.odds)}
                    </p>
                    <p className="text-amber-500 dark:text-amber-400">
                      @ {a.leg1.sportsbook}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-100/50 px-3 py-2 dark:bg-amber-900/30">
                    <p className="text-amber-600 dark:text-amber-400">Leg 2</p>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      {a.leg2.side} {formatOdds(a.leg2.odds)}
                    </p>
                    <p className="text-amber-500 dark:text-amber-400">
                      @ {a.leg2.sportsbook}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RankingsPanel({ rankings }: { rankings: SportsbookRanking[] }) {
  const GRADE_STYLES: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    C: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    D: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    F: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Sportsbook Quality Rankings
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
          Ranked by average vig across all markets and games. Lower vig = sharper book.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Sportsbook</th>
              <th className="px-5 py-3 text-center">Grade</th>
              <th className="px-5 py-3 text-right">Spread Vig</th>
              <th className="px-5 py-3 text-right">ML Vig</th>
              <th className="px-5 py-3 text-right">Total Vig</th>
              <th className="px-5 py-3 text-right">Avg Vig</th>
              <th className="px-5 py-3 text-right">Best Odds</th>
              <th className="px-5 py-3 text-right">Value Opps</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r) => (
              <tr
                key={r.sportsbook}
                className={`border-t border-zinc-50 dark:border-zinc-800/50 ${
                  r.rank === 1
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                    : r.rank === rankings.length
                      ? "bg-red-50/30 dark:bg-red-950/10"
                      : ""
                }`}
              >
                <td className="px-5 py-3 font-mono text-zinc-500 dark:text-zinc-400">
                  {r.rank}
                </td>
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  {r.sportsbook}
                  {r.rank === 1 && (
                    <span className="ml-2 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">
                      SHARPEST
                    </span>
                  )}
                  {r.rank === rankings.length && (
                    <span className="ml-2 text-[10px] font-semibold text-red-500 dark:text-red-400">
                      JUICIEST
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${GRADE_STYLES[r.grade] ?? GRADE_STYLES.C}`}>
                    {r.grade}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                  {r.avg_spread_vig.toFixed(1)}%
                </td>
                <td className="px-5 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                  {r.avg_moneyline_vig.toFixed(1)}%
                </td>
                <td className="px-5 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                  {r.avg_total_vig.toFixed(1)}%
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {r.avg_combined_vig.toFixed(1)}%
                </td>
                <td className="px-5 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                  {r.games_with_best_odds}
                </td>
                <td className="px-5 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                  {r.total_value_opps_offered}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
