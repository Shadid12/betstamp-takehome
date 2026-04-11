## Getting Started

First create a `.env` file and to include your `CLAUDE_API_KEY` 

```sh
CLAUDE_API_KEY=<your-key>
```

Install packages

```sh
npm i 
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Deplyed URL [betstamp-takehome-iota.vercel.app](https://betstamp-takehome-iota.vercel.app/)



## Example Chat Questions (Tool Use)

### Single-tool calls

| Question | Tool triggered |
|---|---|
| "What games are on the slate today?" | `list_games` |
| "Show me all the odds for the Lakers game" | `get_game_odds` |
| "What lines does DraftKings have across all games?" | `get_sportsbook_odds` |
| "What are the moneylines across the full slate?" | `get_market_odds` |
| "Compare all the books on the Celtics vs Lakers game" | `compare_sportsbooks_for_game` |
| "Where do I get the best price on the Nuggets game?" | `find_best_odds` |
| "What does FanDuel have for the Knicks game?" | `get_line_for_game_and_book` |
| "Are there any stale or outdated lines?" | `find_stale_lines` |

### Multi-tool chains (Claude calls 2+ tools in sequence)

| Question | Expected tool chain |
|---|---|
| "Which book has the best moneyline on the Heat game and what's the line?" | `find_best_odds` → `get_line_for_game_and_book` |
| "Compare the spread on the Mavs game between DraftKings and Pinnacle" | `get_line_for_game_and_book` (×2) |
| "What's the best price on every game's moneyline?" | `list_games` → `find_best_odds` (×N) |
| "Is PointsBet stale on any games? If so, show me their lines vs the freshest book" | `find_stale_lines` → `get_line_for_game_and_book` |

### Compound questions (tools + pre-computed analysis)

| Question | What happens |
|---|---|
| "The briefing flagged value on the Warriors spread — show me the raw odds from every book on that game" | Uses briefing context + `get_game_odds` |
| "Which of the arbitrage opportunities involves DraftKings? Show me those exact lines" | Uses analysis context + `get_line_for_game_and_book` |
| "The Suns game has high vig — break down each book's spread for me" | Uses analysis context + `get_market_odds` with game filter |
