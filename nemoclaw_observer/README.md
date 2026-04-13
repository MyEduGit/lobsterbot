# NemoClaw Observer — lobsterbot companion

Telegram `/dashboard` and `/status` command handlers for the NemoClaw
Observer agent. The core observer lives in the **mircea-constellation**
repo at `nemoclaw_observer/observer.py`; this side of the module exposes it
over a python-telegram-bot v20+ application.

## Wiring into hetzy_phd.py

```python
from telegram.ext import Application, CommandHandler
from nemoclaw_observer.telegram_handler import (
    handle_dashboard_command,
    handle_status_command,
)

application = Application.builder().token(TELEGRAM_TOKEN).build()
application.add_handler(CommandHandler("dashboard", handle_dashboard_command))
application.add_handler(CommandHandler("status",    handle_status_command))
application.run_polling()
```

## Standalone smoke test

```bash
cd nemoclaw_observer
./run.sh                 # prints the full dashboard locally
```

The handler module will try two import paths:

1. `nemoclaw_observer.observer` (installed as a package)
2. `../../mircea-constellation/nemoclaw_observer/observer.py`
   (sibling checkout on the VPS)

If neither is found, `/dashboard` replies with a graceful error telling
the operator to deploy the core observer.

## Environment

Shares a single `.env` with the core observer. See
`mircea-constellation/nemoclaw_observer/config.env.example`. At minimum
you need `TELEGRAM_TOKEN`, `TELEGRAM_CHAT`, `VPS_HOST`, and `PG_DSN`.
