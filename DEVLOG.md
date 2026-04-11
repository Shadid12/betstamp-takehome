# New webpage for displaying data
_Exported on 4/10/2026 at 12:59:49 EDT from Cursor (3.0.13)_

---

**User**

@app/page.tsx:1-7 Let's create a new webpage that will read the data from the @data/data.json and put it in a table in the page.

---

**Cursor**

Let me start by reading the data file and understanding its structure.

Now let me look at the full structure of the data to understand all game records and unique fields.

Good. Now I have a full picture. It's a Next.js 16 app with Tailwind 4. Let me check the Next.js docs for any relevant changes before building.

This is a straightforward server component reading a JSON file. Let me check if there's anything specific about data fetching or server components in Next.js 16.

The setup is standard Next.js with server components. Since this is a server component reading a local JSON file, I can simply import the data directly. Let me build the page now.

Let me verify the app builds properly.

The build succeeded with no errors. The page is now ready. Here's what I built:

**NBA Odds Dashboard** — the page reads all 80 records from `data/data.json` and displays them grouped by game in clean, responsive tables. Each game section shows:

- **Header**: Away team @ Home team with the game time
- **Table columns**: Sportsbook name, Spread (home/away lines with odds), Moneyline (home/away), Total (over/under with line and odds), and Last Updated timestamp
- **Styling**: Alternating row backgrounds, monospace numbers, responsive horizontal scrolling for smaller screens, and full dark mode support

The page is a server component so the JSON import is resolved at build time — no client-side JS needed.

---

**User**

Can we collapse them into one table I can see multiple tables 

---

**Cursor**

Builds cleanly. Everything is now in a single table. The **Game** column uses `rowSpan` to merge cells for each game group — showing the away team @ home team and game time once — while each sportsbook row sits on its own line. A thicker border separates each game group so they're visually distinct without being separate tables.

---

**User**

Let's add some frontend search functionality to the table 

---

**Cursor**

Since search requires client-side interactivity, I'll extract the table into a client component and keep the data loading in the server component.

Now update `page.tsx` to be a thin server component that loads the data and passes it to the client component.

Builds cleanly. Here's what changed:

- **New client component** `app/odds-table.tsx` — contains the full table plus a search input at the top. The `"use client"` directive enables React state.
- **`page.tsx`** is now a thin server component that loads the JSON and passes the grouped games as props.

The search filters by **team name** or **sportsbook name** in real time. When a team name matches, all sportsbook rows for that game are shown. When a sportsbook name matches, only those specific rows appear. There's also a clear button (X) and a result count banner when filtering is active. If nothing matches, a "No results" empty state is displayed.

---

**User**

Besides the Table Title Let's create a new Button that will trigger Anamoly detection. For now don't hook it up to any APIs

---

**Cursor**

The header is in a server component, so I need to extract a client component for the button. The simplest approach is to put the button inline in the header and make the page a client-aware layout. But since the header is in a server component and we just need a button, I'll create a small client component for it.

Done. I added a **"Detect Anomalies"** button next to the title in the header. Here's what it does:

- **`app/anomaly-button.tsx`** — a `"use client"` component with a warning-triangle icon and an indigo button style
- Clicking it triggers a fake 1.5-second loading state with a spinner and "Detecting…" text, then resets — no API wired up yet
- The button sits to the right of the title on desktop, and stacks below it on mobile



# AI-powered odds agent development
_Exported on 4/10/2026 at 13:00:20 EDT from Cursor (3.0.13)_

---

**User**

Now our goal is to create a AI-powered odds agent that does the following 
1. Detect — Flag anomalies in the data (stale lines, outlier prices, potential errors) 

Let's create an API endpoint for this. We will be using the CLAUDE_API_KEY and Claude models to do this. 

---

**Cursor**

I'll start by understanding the current project structure and the data format before building the API endpoint.

Now let me read the key files to understand the exact data structures and the anomaly button.

Now let me check the Next.js docs for the API route conventions in this version.

Now I have a solid understanding of the project. Let me create the API endpoint and wire up the anomaly button.

Now let me create the API route. This will send the odds data to Claude with a carefully crafted prompt to detect anomalies like stale lines, outlier prices, and potential errors.

Now let me update the `AnomalyButton` to actually call the API and display results, and update `page.tsx` to manage the anomaly state.

Now let me update `page.tsx` slightly so the anomaly section has proper layout space:

No linter errors. Let me test the endpoint by starting the dev server and hitting it with curl.

There's already a dev server running on port 3000. Let me test the endpoint against that.

The endpoint is working and returning anomalies. Let me see the full response to verify the structure is solid.

The endpoint is working perfectly. Let me verify the final state of all files.

Everything is working. Here's a summary of what was built:

---

### API Endpoint: `POST /api/detect-anomalies`

**File:** `app/api/detect-anomalies/route.ts`

The endpoint sends all 80 odds records from `data.json` to Claude Sonnet with a domain-expert system prompt that instructs it to detect three categories of anomalies:

1. **Stale Lines** — sportsbooks whose `last_updated` is significantly older than peers for the same game
2. **Outlier Prices** — spread, moneyline, or total values that deviate significantly from the cross-book consensus
3. **Potential Errors** — impossible/suspicious values like mismatched spreads, extreme vig, etc.

**Response shape:**

```json
{
  "anomalies": [
    {
      "game_id": "nba_20260320_lal_bos",
      "sportsbook": "PointsBet",
      "type": "stale_line",
      "severity": "high",
      "market": "timestamp",
      "description": "...",
      "details": { ... }
    }
  ],
  "meta": {
    "model": "claude-sonnet-4-20250514",
    "games_analyzed": 10,
    "records_analyzed": 80,
    "detected_at": "2026-04-10T..."
  }
}
```

### Frontend: `AnomalyButton` Updated

The button now actually calls the API and renders a full anomaly report with severity badges (high/medium/low), anomaly type labels, and expandable detail rows — all styled to match the existing dashboard theme.

### Test Results

Claude correctly identified 7 seeded anomalies across the dataset including stale timestamps on PointsBet, BetRivers, and Caesars, outlier moneylines on BetMGM, and off-market totals on BetRivers and Caesars.

---

**User**

In the same API endpoint you will make another API call to Anthropic that will do the following 
- Analyze — Identify the best available odds, calculate vig, and surface value opportunities

---

**Cursor**

Let me read the current state of the API route to understand what we're working with.

Now let me also read the anomaly button since we'll need to update it to display the new analysis results.

Now I have a clear picture. I'll add a second parallel Claude call to the API route for odds analysis (best odds, vig calculation, value opportunities), then update the frontend to render both sections.

Now let me update the frontend to display the analysis results alongside the anomaly report.

No lint errors. Let me test the updated endpoint.

Everything is working. Both calls execute in parallel and the response is complete.

Everything is working end-to-end. Here's what was added:

---

### Second Claude Call: Odds Analysis

The API route now fires **two Claude calls in parallel** via `Promise.all`:

1. **Anomaly Detection** (existing) — stale lines, outlier prices, potential errors
2. **Odds Analysis** (new) — best available odds, vig calculation, and value opportunities

The analysis prompt instructs Claude to:

- **Best Available Odds** — For each game and market (spread, moneyline, total), find which sportsbook offers the best price for each side
- **Vig Calculation** — Convert American odds to implied probabilities and compute the overround for every sportsbook/market combo, then identify the sharpest (lowest-vig) book per game
- **Value Opportunities** — Flag sportsbooks offering meaningfully better odds than consensus (10+ cents of value)
- **Arbitrage Detection** — Identify any cross-book combinations where both sides can be bet for guaranteed profit

### Updated Frontend

The UI now has a **tabbed interface** with three sections:

| Tab | Content |
|---|---|
| **Anomalies** | Same anomaly cards as before |
| **Best Odds & Vig** | Per-game cards showing best available odds across markets, vig table sorted by sharpness, and sharpest book callout |
| **Value Opportunities** | Value plays with offered vs. consensus odds, plus arbitrage opportunities with both legs and profit margin |

The test confirmed the endpoint returns analysis for all 10 games, identified Pinnacle as the sharpest book (as expected), found value opportunities like Lakers +5.5 at -102 on FanDuel vs consensus -111, and even detected an arbitrage opportunity.

---

**User**

Finally based on the results of the previous API calls the Agent will make a final API call to LLM that will do the following 

Brief — Generate a clear, accurate daily market briefing that a human analyst could review
and act on

---

**Cursor**

Let me read the current state of both files to understand what I'm working with.

Good, I have the full picture. The third call takes the *results* of the first two calls and synthesizes a natural-language market briefing. Let me update both files.

Now let me update the frontend to add the Briefing tab and render the markdown content.

Now add the `BriefingPanel` component. I'll place it right after the `AnomalyButton` function and before `AnomaliesPanel`.

Now let me test the full 3-call pipeline.

The API is temporarily overloaded. Let me retry in a moment.

The Anthropic API is returning 529 (overloaded). Let me add retry logic to the API route so it's more resilient, then try again with a longer wait.

Let me add simple retry logic to make the calls more resilient.

Now wrap the three API calls with the retry helper.

Let me verify the route file is syntactically correct by checking lints.

Good. Let me wait a bit longer for the API to recover, then test.

The API calls went through but there's a JSON parsing error in the analysis response. The Claude response likely contained truncated JSON. Let me make the `parseJsonResponse` helper more robust to handle this, and also increase the `max_tokens` for the analysis call since the 10-game analysis is a large JSON payload.

Also increase the analysis max_tokens to avoid truncation.

The full 3-call pipeline is working beautifully. Let me verify the final files are clean.

Everything is complete and passing. Here's a summary of what was built:

---

### Third Claude Call: Daily Market Briefing

The API endpoint now executes a **3-stage pipeline**:

| Stage | Calls | Purpose |
|-------|-------|---------|
| 1 | 2 parallel calls | Anomaly detection + Odds analysis |
| 2 | 1 sequential call | Briefing generation (takes outputs of stage 1 as input) |

The briefing prompt instructs Claude to act as a **senior market analyst writing for a trading desk**, producing a structured Markdown report with these sections:

- **Market Overview** — Executive summary of the slate
- **Data Quality Alerts** — Critical anomalies grouped by severity
- **Top Value Plays** — 3-5 best actionable bets ranked by edge size
- **Arbitrage Alert** — Any guaranteed-profit opportunities
- **Sharpest Books Today** — Sportsbook ranking by vig
- **Game-by-Game Snapshot** — Compact per-game summary with consensus lines and best prices
- **Analyst Notes** — Higher-level observations and warnings

### Key improvements also made:

- **Retry logic** — All three Claude calls now auto-retry up to 3 times with exponential backoff on 529/overloaded errors
- **JSON repair** — The parser can now recover from truncated Claude JSON responses by closing unclosed brackets
- **Increased token budget** — Analysis call bumped to 16K tokens to avoid truncation on 10-game slates

### Frontend

The **Daily Briefing** tab is now the default landing tab, rendering the full Markdown briefing with a lightweight inline renderer (headings, lists, bold, code). The existing Anomalies, Best Odds & Vig, and Value tabs remain for the structured data drill-down.

---

**User**

We also need the ability to ask follow up questions based on the result that was provided by the model. Can you create a chat interface for asking follow up questions 

---

**Cursor**

Let me review the current files to plan the implementation.

Now I have the full picture. I need to:
1. Create a new `/api/chat` route that receives the conversation history plus the analysis context and forwards it to Claude
2. Add a chat interface component that appears after the agent results, maintaining conversation history

Now let me create the ChatPanel component and wire it into the tabs. I'll add it to the `anomaly-button.tsx` file since all the result state lives there.

Now add the chat state and the tab definition inside the `AnomalyButton` component.

Now add the "Ask AI" tab to the tab list and clear chat messages on new analysis.

Now add the ChatPanel rendering in the tab content section.

Now add the ChatPanel component. I'll place it after the `BriefingPanel` and before `AnomaliesPanel`.

Let me test the chat endpoint directly to make sure it works.

The chat API is working perfectly. Let me also test a multi-turn conversation.

Multi-turn conversation is working perfectly — the model maintains context and answers coherently.

Everything is working. Here's what was built:

---

### New: Chat Follow-Up Interface

#### API Route: `POST /api/chat`

**File:** `app/api/chat/route.ts`

The endpoint receives the full conversation history plus the analysis context (anomalies, analysis, briefing), and sends it all to Claude with a system prompt that positions it as an expert analyst who has just completed the analysis. The conversation structure:

1. **Context injection** — The anomaly results, market analysis, and briefing are loaded as the first message pair so Claude has full awareness of all findings
2. **Conversation history** — All user/assistant messages are forwarded, enabling multi-turn dialogue
3. **Grounded responses** — The system prompt tells Claude to use specific numbers, sportsbook names, and data from the analysis rather than speculating

#### Frontend: "Ask AI" Tab

**File:** `app/anomaly-button.tsx` (updated)

A new **Ask AI** tab appears alongside the existing tabs with a full chat interface:

- **Suggestion chips** — When the chat is empty, 4 pre-built questions help users get started (e.g. "Which game has the best value bet right now?", "Explain the BetMGM anomaly in detail")
- **Chat bubbles** — User messages appear right-aligned in indigo, assistant responses left-aligned with full Markdown rendering (bold, code, lists, headings)
- **Typing indicator** — Animated bouncing dots while waiting for a response
- **Auto-growing textarea** — Input expands up to 120px as you type, Enter sends, Shift+Enter for newlines
- **Clear chat** — Button to reset the conversation
- **State persistence** — Chat history persists across tab switches within the same analysis session; cleared when a new analysis is run

# Implied probabilities and betting odds calculations
_Exported on 4/11/2026 at 09:25:17 EDT from Cursor (3.0.13)_

---

**User**

the LLM model needs to perform accurate math 
American → Implied Probability: Negative odds: |odds|/(|odds|+100). Positive:
100/(odds+100). Example: -150 → 60%, +200 → 33.3%

Vig/Margin: Sum the implied probabilities of both sides. Subtract 1. Example: -110/-110 →
52.38% + 52.38% = 104.76% → 4.76% vig

No-vig fair odds: Normalize implied probabilities to sum to 100%

Best line: Across books, which offers the highest payout (lowest implied probability) on each
side?

Since we are using Claude should we do a functin calling or a local MCP to do this accurately. Which approch would you take 

---

**Cursor**

Great question. This is really about whether the math should happen inside the LLM or outside it. Let me look at your current implementation to understand the context first.

Let me look at your current anomaly detection route and the overall architecture.

Now let me also check the data structure to understand the volume of calculations involved.

Here's my recommendation:

## Do the math in deterministic code, not in the LLM

**Neither function calling nor a local MCP.** The right approach is a plain TypeScript utility module that computes everything before Claude ever sees the data. Here's why:

### The problem with asking an LLM to do this math

Your current `ANALYSIS_SYSTEM_PROMPT` asks Claude to:
1. Convert 160 American odds values (80 records x 2 sides) to implied probabilities
2. Compute vig for every sportsbook/market combo (~240 calculations)
3. Compare across books to find best lines
4. Detect arbitrage by checking combined probabilities < 1

LLMs are unreliable at arithmetic. Claude will get *most* of these right, but it only takes one wrong vig calculation or one missed arbitrage to produce a bad briefing. You're also burning tokens having it do work that 50 lines of TypeScript can do perfectly every time.

### The approach I'd take: **Pre-compute, then narrate**

```
┌─────────────┐     ┌──────────────────────┐     ┌────────────────┐
│  data.json  │────▶│  TypeScript math lib  │────▶│  Claude calls   │
│  (80 records)│     │  (deterministic)      │     │  (interpretation│
└─────────────┘     │                      │     │   + briefing)   │
                    │  • impliedProb()     │     └────────────────┘
                    │  • calcVig()         │
                    │  • bestLine()        │
                    │  • findArbitrage()   │
                    │  • noVigFairOdds()   │
                    └──────────────────────┘
```

Concretely, create something like `lib/odds-math.ts`:

```typescript
export function impliedProbability(americanOdds: number): number {
  return americanOdds < 0
    ? Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
    : 100 / (americanOdds + 100);
}

export function calcVig(odds1: number, odds2: number): number {
  const p1 = impliedProbability(odds1);
  const p2 = impliedProbability(odds2);
  return (p1 + p2 - 1) * 100; // e.g. 4.76%
}

export function noVigFairOdds(odds1: number, odds2: number) {
  const p1 = impliedProbability(odds1);
  const p2 = impliedProbability(odds2);
  const total = p1 + p2;
  return { fair1: p1 / total, fair2: p2 / total };
}

export function findBestLine(
  records: Array<{ sportsbook: string; odds: number }>
) {
  // Lowest implied probability = best payout for the bettor
  return records.reduce((best, r) =>
    impliedProbability(r.odds) < impliedProbability(best.odds) ? r : best
  );
}

export function findArbitrage(
  side1Books: Array<{ sportsbook: string; odds: number }>,
  side2Books: Array<{ sportsbook: string; odds: number }>
) {
  const best1 = findBestLine(side1Books);
  const best2 = findBestLine(side2Books);
  const combined = impliedProbability(best1.odds) + impliedProbability(best2.odds);
  if (combined < 1) {
    return {
      leg1: best1,
      leg2: best2,
      combinedProb: combined,
      profitMarginPct: (1 - combined) * 100,
    };
  }
  return null;
}
```

Then in your API route, you'd run all the math first, then pass the **pre-computed results** to Claude:

```typescript
// Step 0: Deterministic math
const computedAnalysis = computeFullAnalysis(data.odds);

// Step 1: Claude gets the numbers as FACTS, not as homework
const [anomalyResponse, briefingResponse] = await Promise.all([
  callClaude(ANOMALY_PROMPT, oddsPayload),
  callClaude(BRIEFING_PROMPT, JSON.stringify(computedAnalysis)),
]);
```

### Why not function calling or MCP?

| Approach | Verdict |
|---|---|
| **Function calling** | Adds roundtrip latency. Claude calls a tool, waits for the result, then continues. For 80 records x multiple markets, this is many tool calls or one giant batch. Overkill when you can just compute everything upfront. |
| **Local MCP server** | Same idea as function calling but with more infrastructure overhead (separate process, protocol, etc.). Makes sense if you need a reusable service across different clients — you don't. |
| **Pre-compute in TypeScript** | Zero latency, zero tokens wasted on math, 100% accurate, trivially testable with unit tests. Claude's job becomes *interpretation and narration*, which is what it's actually good at. |

### What changes in the pipeline

Your current 3-call pipeline becomes:

1. **TypeScript** computes: vig per book/market, best lines, no-vig fair odds, arbitrage, value opportunities
2. **Claude call 1** (anomaly detection) — stays roughly the same, since anomaly detection is pattern matching / judgment, not math
3. **Claude call 2** (briefing) — receives the pre-computed analysis as structured data and writes the narrative briefing. You can even drop the analysis Claude call entirely, since the math IS the analysis.

This collapses your pipeline from 3 Claude calls (2 parallel + 1 sequential) down to **2 calls** (1 parallel + 1 sequential), cutting cost and latency, while making the math bulletproof.

### Bottom line

Use Claude for what it's good at — language, judgment, pattern recognition, and narration. Use TypeScript for what it's good at — arithmetic. A `lib/odds-math.ts` module with ~50-80 lines of pure functions is the right tool here.

---

**User**

Let's mplement the Pre-compute in TypeScript plan for all three functions 

---

**Cursor**

Let me start by reading the current files to understand the full picture before implementing.

Now let me check the full data structure to understand all the fields across a few different game records.

Now I have the full picture. Let me check the project structure to know where to place the new lib file.

Good. I have the full picture. Let me create the plan and start implementing.

Starting with the core math library.

Now building the analysis pipeline that uses those math functions to produce the exact same output shape the frontend already expects.

Now the big refactor — rewriting the API route to use pre-computed analysis instead of asking Claude to do math.

Now update the chat route to also tell Claude the analysis is pre-computed and exact.

Now let's check lints and build.

Zero lints, zero type errors. Let's also verify the build passes.

Build passes cleanly. Now let me also verify the `anomaly-button.tsx` frontend still type-checks against the new analysis shape — the output has one new field (`no_vig_fair_odds`) but the existing `GameAnalysis` type in the frontend doesn't reference it, so it should be fine. Let me double-check.

Good — the frontend doesn't reference it, so the extra field is simply ignored by the existing types. Everything is compatible.

Everything is done. Here's a summary of what was built:

---

### New: `lib/odds-math.ts` — Pure math functions

All betting math is now deterministic TypeScript, not LLM output:

| Function | What it does |
|---|---|
| `impliedProbability()` | American odds → probability (e.g. -150 → 0.60, +200 → 0.333) |
| `calcVig()` | Two-sided vig as percentage (e.g. -110/-110 → 4.76%) |
| `noVigFairProbabilities()` | Removes vig, normalizes to 100% |
| `probabilityToAmerican()` | Fair probability → American odds |
| `findBestOdds()` | Picks the best payout from a set of book offerings |
| `detectArbitrage()` | Checks if best odds on both sides combine to < 100% implied probability |
| `median()` | Used for consensus odds calculation |

### New: `lib/odds-analysis.ts` — Full pre-computation pipeline

`computeFullAnalysis(odds)` produces the complete analysis in one pass:
- **Best available odds** for every game/market/side
- **Vig per sportsbook** for spread, moneyline, and total
- **Sharpest book** identification per game
- **No-vig fair odds** derived from the sharpest book
- **Value opportunities** flagged when a book offers 10+ cents better than median consensus
- **Arbitrage detection** across all markets

The output shape is identical to what the frontend already consumes — zero frontend changes needed.

### Refactored: `app/api/detect-anomalies/route.ts`

**Before:** 3 Claude calls (2 parallel + 1 sequential) — Claude did all the math.

**After:** 2 Claude calls (1 anomaly detection + 1 briefing, sequential) — math is pre-computed in ~1ms.

- The analysis Claude call is completely removed
- Both remaining Claude calls receive the pre-computed analysis as context with explicit instructions to treat the numbers as exact and quote them verbatim
- The pipeline is faster (one fewer API call), cheaper (fewer tokens), and the math is now bulletproof

### Updated: `app/api/chat/route.ts`

The chat system prompt now instructs Claude that all market analysis data is deterministic and mathematically exact — no re-deriving or rounding differently.


# Daily briefing structure and components
_Exported on 4/11/2026 at 10:09:36 EDT from Cursor (3.0.13)_

---

**User**

@route.ts (1-236) 

we need to generate a structured daily briefing with: market overview, flagged anomalies, top value
opportunities, and sportsbook quality rankings as the final response. Review the response and implement this 

---

**Cursor**

Let me start by reading the full route file and the related files to understand the current implementation.

Now let me see the frontend components that consume this API response.

Now let me check the rest of the route file (after line 236) and the data shape.

Now I have a clear picture of the codebase. The current API response returns `{ anomalies, analysis, briefing (markdown string), meta }`. The goal is to make the final response a properly structured daily briefing with: market overview, flagged anomalies, top value opportunities, and sportsbook quality rankings.

The key insight: most of this data (value opportunities, best odds, vig, arbitrage) is already computed deterministically by `computeFullAnalysis`. What we need is to:

1. Build sportsbook quality rankings deterministically from the existing vig data
2. Restructure the API response to include a `structured_briefing` object with all sections as typed data
3. Have Claude's narrative briefing still serve as the prose summary, but also return the structured data
4. Update the frontend to display the structured briefing sections

Let me start building the sportsbook rankings and structured briefing in the analysis layer.

Now I have full context. Let me implement the structured daily briefing. Here's the plan:

1. **Add `SportsbookRanking` type and ranking computation** to `odds-analysis.ts` — deterministic sportsbook quality rankings aggregated across all games
2. **Add a `DailyBriefing` type** that structures the final response with all sections
3. **Update the route** to build the structured briefing, keeping Claude only for the narrative/overview and anomaly detection
4. **Update the frontend** to render the new structured response

Now add the sportsbook ranking and top value play computation at the end of `computeFullAnalysis`, before the return:

Now update the route to build the structured daily briefing response. The key change: Claude still generates the narrative briefing (market overview, analyst notes), but the final response is a structured object that includes both the AI narrative and the deterministic data.

Now update the POST handler to build the structured response:

Now I need to update the frontend (`anomaly-button.tsx`) to consume the new structured response format. The response shape has changed from `{ anomalies, analysis, briefing, meta }` to `{ daily_briefing, analysis, meta }`.

Now update the tabs and tab content to use the new `daily_briefing` structure:

Now replace the `BriefingPanel` with the new `OverviewPanel` that renders the structured briefing:

Now replace the old `ValuePanel` with the new `TopValuePanel` and add the `RankingsPanel`:

Now let me check for linter errors across the modified files.

Let me also check if there's a chat API route that references the old response structure.

The chat route receives context from the frontend, and the frontend is now passing `briefing: briefing.market_overview`. That's fine — the chat API is flexible with `unknown` types, so it'll work with the new data shape.

Now let me verify the complete state of the modified files to make sure everything is consistent.

Good. Let me also verify the `MarkdownRenderer` and `ChatPanel` are still intact in the file (they're needed by the chat tab and also used within ChatPanel).

Good, both are still present. Let me now do a final check on the lints.

Let me also verify the build compiles.

Clean compile. Let me update the todos.

Here's a summary of all the changes:

### What changed

**`lib/odds-analysis.ts`** — Added two new types and their deterministic computation:

- **`SportsbookRanking`** — Aggregates each sportsbook's vig across all games, assigns a rank (1 = sharpest) and letter grade (A-F based on avg combined vig thresholds), plus counts of how many best-odds/value-opp appearances each book has.
- **`TopValuePlay`** — A global top-10 list of value opportunities ranked by edge size in cents, pulled from all games.
- Both are now included in the `FullAnalysis` return type.

**`app/api/detect-anomalies/route.ts`** — Restructured the final response:

- The briefing system prompt now asks Claude to return **structured JSON** (`market_overview`, `game_snapshots`, `analyst_notes`) instead of free-form markdown. This keeps Claude doing what it's good at (narrative synthesis) while avoiding it re-deriving math.
- The API assembles a `daily_briefing` object that merges Claude's narrative sections with the deterministic data:

```typescript
{
  daily_briefing: {
    market_overview: string,      // AI-generated executive summary
    anomalies: AnomalyDetail[],   // AI-detected anomalies
    top_value_plays: TopValuePlay[], // Deterministic, ranked by edge
    arbitrage_opportunities: ArbitrageOpportunity[], // Deterministic
    sportsbook_rankings: SportsbookRanking[], // Deterministic
    game_snapshots: GameSnapshot[],  // AI-generated per-game summaries
    analyst_notes: string[],         // AI-generated observations
  },
  analysis: FullAnalysis,  // Complete deterministic analysis
  meta: { ... }
}
```

**`app/anomaly-button.tsx`** — Rewired the frontend to consume the new structure:

- **Market Overview tab** — Replaces the old markdown briefing with a structured panel: overview text, stat cards (anomalies, value plays, arb opps, sharpest book), game-by-game snapshots, and analyst notes.
- **Top Value tab** — Now renders the globally-ranked `top_value_plays` with rank badges and edge-in-cents display, plus arbitrage opportunities below.
- **Book Rankings tab** — New tab showing the sportsbook quality rankings table with grade badges (A-F), per-market vig columns, best-odds count, and value-opp count. Sharpest/juiciest books are highlighted.
- All other tabs (Anomalies, Best Odds & Vig, Ask AI) continue to work with the new data shape.



# JSON data search function
_Exported on 4/11/2026 at 10:44:40 EDT from Cursor (3.0.13)_

---

**User**

Create another function that can search the JSON file and pick up the exact data that is necessary to asnwe questions if user asks about a particular dataset.  @app/api/chat/route.ts put the function in lib directory 

---

**Cursor**

Let me start by reading the current chat route and understanding the data structure.

Now let me see the full JSON structure to understand all the data fields.

Now I have a clear picture of the data structure. Let me create a search function that can intelligently extract the exact subset of data from the JSON file based on what the user is asking about.

Now let me update the chat route to use this search function so only relevant data gets sent to Claude instead of the entire dataset.

Clean. Now let me wire it into the chat route so the search function is used to pull only the relevant slice of data for each user question.

Let me verify the final state of both files.

Here's what I built:

### `lib/data-search.ts` — Targeted dataset search

The `searchOddsData(query)` function takes a natural-language user question and returns only the relevant slice of `data/data.json`. It works through intent classification:

**Intent detection** — parses the query to figure out what the user is asking about:
- **Game** — "What are the Lakers odds?" → filters to records where Lakers are home or away
- **Sportsbook** — "What does DraftKings have?" → filters to DraftKings records only
- **Market** — "Show me the spreads" → strips records to just the spread market
- **Game + Sportsbook** — "Celtics on FanDuel" → intersection of both filters
- **Game + Market** — "Lakers moneyline" → team-filtered, market-scoped
- **Stale data** — "Any outdated lines?" → finds records >2 hours behind the freshest update for their game
- **All** — fallback when no specific intent is detected

**Fuzzy matching** — team names and sportsbooks are matched via alias dictionaries (e.g., "Celtics", "BOS", "Boston" all resolve to "Boston Celtics"; "DK", "Draft Kings" resolve to "DraftKings").

### Integration with `app/api/chat/route.ts`

The chat route now calls `searchOddsData()` on the latest user message before building the context block. The targeted raw odds data is injected as an additional `TARGETED RAW ODDS DATA` section in the prompt, so Claude gets both the pre-computed analysis **and** the exact underlying records needed to answer the specific question — without flooding the context with 80 irrelevant records.

---

**User**

is this a good way to do this? Or should we create a different approch like tool use ?

---

**Cursor**

Good question. Let me think about this properly by comparing the two approaches in the context of your setup.

**Current approach (keyword search):** The `data-search.ts` function uses regex/alias matching to guess what the user is asking about, then pre-filters the data before sending it to Claude. It's fast and deterministic, but brittle — if a user phrases something unexpectedly (e.g., "which book has the tightest juice on the BOS/LAL game?"), the keyword matcher might miss the intent or match incorrectly. It also can't compose multiple filters dynamically.

**Tool use approach:** You give Claude a set of tools (search by game, search by sportsbook, search by market, find stale lines, etc.) and let it decide which tool(s) to call based on the question. Claude is much better at understanding intent than regex. It can also chain multiple calls — e.g., first look up the game, then narrow to a specific sportsbook.

For a betting odds dataset like this, **tool use is the stronger approach** because:

1. **Intent classification is Claude's strength** — it already understands "tightest juice" means lowest vig, "which book" means sportsbook comparison, etc. You don't need to replicate that with regex.
2. **Composability** — Claude can call multiple tools per turn (e.g., get Lakers data + get DraftKings data + compare).
3. **Precision** — the model only pulls what it actually needs, rather than you guessing upfront.
4. **Maintainability** — adding a new query type means adding a tool, not debugging regex patterns.

Want me to refactor this to a tool-use architecture? The tools would be simple data-retrieval functions (get game odds, get sportsbook odds, find stale lines, etc.) and Claude would orchestrate them via the Anthropic tool-use API. The alias dictionaries and filtering logic you already have would be reused inside the tool implementations.

---

**User**

Let's update the approch to do tool use on the dataset 

---

**Cursor**

Let me read the current files to understand the full picture before refactoring.

Good, I have the full picture. Now let me build the tool-use architecture. I'll rewrite `lib/data-search.ts` as the tool definitions + executor, then refactor the chat route to run a tool-use loop.

Now refactor the chat route to run Claude with tools in a loop.

Both files are clean. Here's a summary of the refactored architecture:

---

### How it works now

**Before:** Regex-based keyword search pre-filtered data, injected the full result into the context, and Claude got one shot to answer.

**After:** Claude gets 8 tools and decides what to query based on the user's question. The chat route runs a **tool-use loop** (up to 10 rounds) — Claude can call multiple tools per turn and chain lookups until it has enough data to answer.

### The 8 tools in `lib/data-search.ts`

| Tool | What it does |
|---|---|
| `list_games` | Discover all games in the slate (IDs, teams, times) |
| `get_game_odds` | All sportsbook records for a game (by ID or team name) |
| `get_sportsbook_odds` | All game lines from a specific book |
| `get_market_odds` | Pull spread/moneyline/total across the slate, optionally filtered to a game |
| `compare_sportsbooks_for_game` | Side-by-side book comparison for a game |
| `find_best_odds` | Best available price on each side of each market for a game |
| `get_line_for_game_and_book` | Pinpoint lookup: one book, one game |
| `find_stale_lines` | Find lines >2 hours behind the freshest update |

### The loop in `app/api/chat/route.ts`

The route sends the pre-computed analysis context (anomalies, vig, value plays, briefing) as a prefill, then passes the user's messages along with the tool definitions. When Claude responds with `tool_use`, the route executes each tool call via `executeTool()`, appends the results, and loops back. When Claude responds with `end_turn`, the final text is returned to the client.

The alias dictionaries (team nicknames, sportsbook abbreviations) are preserved inside the tool implementations so Claude can pass "Lakers" or "DK" and get resolved results.

