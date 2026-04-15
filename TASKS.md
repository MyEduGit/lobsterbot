# Lobsterbot — Task Priorities

> Managed by the [Task Prioritiser](https://myedugit.github.io/mircea-constellation/prioritiser.html) in mircea-constellation.

## Active Tasks

| ID      | Priority | Title                                       | Deadline   | Status    |
|---------|----------|---------------------------------------------|------------|-----------|
| LOB-001 | P2 HIGH  | Implement Telegram bot core in index.js      | 2026-05-01 | Completed |
| LOB-002 | P3 MED   | Add npm dependencies (telegraf, anthropic)   | 2026-04-20 | Completed |

## What Was Built

- `index.js` — full Telegram bot with Claude Opus 4.6 integration
  - Per-user conversation history (up to 20 messages)
  - Prompt caching on the UrantiOS system prompt (saves tokens on every turn)
  - Commands: /start, /help, /clear
  - Graceful error handling (rate limits, auth errors)
  - Echo mode when ANTHROPIC_API_KEY not set
- `package.json` — dependencies: `@anthropic-ai/sdk`, `node-telegram-bot-api`, `dotenv`

## Running

```bash
npm install
npm start
```

Requires `.env` with:
```
TELEGRAM_BOT_TOKEN=your_token_from_BotFather
ANTHROPIC_API_KEY=your_anthropic_key
```

## Priority Rules

- **P1 CRITICAL** = do it now, alarm sounds if overdue
- **P2 HIGH** = do it this week
- **P3 MEDIUM** = do it this sprint
- **P4 LOW** = backlog

## Central Dashboard

All tasks across the constellation are tracked at:
`mircea-constellation/task-prioritiser.json`

The visual dashboard with alerts lives at:
`mircea-constellation/prioritiser.html`
