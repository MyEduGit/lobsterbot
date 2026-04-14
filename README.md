# 🦞 LobsterBot

**Telegram frontend for the URANTiOS BookWriter.**

A zero-dependency Node.js (18+) bot that lets authorised Telegram users
trigger full book generation from their phone:

```
/writebook The Bestowal Career of Michael of Nebadon
```

The bot spawns `python -m bookwriter write …` inside the URANTiOS repo,
streams progress, and reports the final exit status and last lines of
output back to the chat.

---

## Commands

| Command                 | What it does                                       |
|-------------------------|----------------------------------------------------|
| `/start`, `/help`       | Show the help banner                               |
| `/writebook <theme>`    | Kick off a book generation (async)                 |
| `/status`               | Progress / last-result of the current chat's job   |

---

## Setup

```bash
cp .env.example .env
# fill in TELEGRAM_BOT_TOKEN and ANTHROPIC_API_KEY
npm start
```

The bot long-polls Telegram; no webhook server required.

## Environment variables

See `.env.example` for the complete list. Key ones:

- `TELEGRAM_BOT_TOKEN` — from @BotFather (required).
- `ANTHROPIC_API_KEY` — forwarded to the `bookwriter` subprocess.
- `LOBSTER_ALLOWED_USER_IDS` — comma-separated Telegram numeric IDs.
  Leave empty for open mode.
- `URANTIOS_REPO` — path to the URANTiOS repo (default: `../URANTiOS`).
- `BOOKWRITER_VAULTS` — colon-separated list of vault roots.
- `BOOKWRITER_DRY_RUN=1` — offline stub (no API calls); useful for testing.

## Governance

Governed by UrantiOS: **Truth · Beauty · Goodness**.
Every book generated through `/writebook` passes the Lucifer Test before
it lands in any vault.

## License

UNLICENSED (name reservation → now the BookWriter Telegram frontend).
