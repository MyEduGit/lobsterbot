#!/usr/bin/env python3
"""
NemoClaw Observer — Telegram /dashboard command handler

Drop this module alongside hetzy_phd.py (or any python-telegram-bot v20+ bot).
Register handle_dashboard_command as a CommandHandler for the /dashboard command.

Example wiring in hetzy_phd.py
-------------------------------
    from nemoclaw_observer.telegram_handler import handle_dashboard_command
    application.add_handler(CommandHandler("dashboard", handle_dashboard_command))

The handler will:
  1. Acknowledge immediately so the user gets instant feedback.
  2. Run the full NemoClaw Observer check cycle.
  3. Reply with the Markdown dashboard.
  4. Store the snapshot to PostgreSQL (handled inside observer.run).

Required environment variables (same as observer.py — share one .env):
  See nemoclaw_observer/config.env.example
"""

import logging
import os
import sys

log = logging.getLogger("NemoClawTelegramHandler")


def _get_observer():
    """Import observer module; return None if unavailable (graceful degradation)."""
    try:
        from nemoclaw_observer import observer
        return observer
    except ImportError:
        # Try a sibling path (VPS deploy where mircea-constellation is checked out)
        sibling = os.path.join(os.path.dirname(__file__), "..", "..",
                               "mircea-constellation", "nemoclaw_observer")
        sys.path.insert(0, os.path.abspath(sibling))
        try:
            import observer
            return observer
        except ImportError:
            log.warning("NemoClaw Observer module not found in any expected location")
            return None


async def handle_dashboard_command(update, context) -> None:
    """
    Async Telegram CommandHandler for /dashboard.
    Works with python-telegram-bot >= 20.0 (async API).
    """
    user = update.effective_user
    log.info("/dashboard requested by %s (id=%s)", user.username, user.id)

    # Immediate acknowledgement — checks can take several seconds
    await update.message.reply_text(
        "\u23f3 Running NemoClaw Observer checks\u2026 please wait."
    )

    observer = _get_observer()
    if observer is None:
        await update.message.reply_text(
            "\u26a0\ufe0f NemoClaw Observer module is not installed on this server.\n"
            "Contact the operator to deploy nemoclaw_observer/observer.py."
        )
        return

    try:
        dashboard_md = observer.run(output="silent")
        # Telegram Markdown v1 — strip code-fence backticks which are unsupported in tables
        safe_md = dashboard_md.replace("```", "")
        await update.message.reply_text(safe_md, parse_mode="Markdown")
    except Exception as exc:
        log.exception("Dashboard generation failed")
        await update.message.reply_text(
            f"\U0001f534 Dashboard error: {exc}\n"
            "Check server logs for details."
        )


async def handle_status_command(update, context) -> None:
    """
    Lighter-weight /status command — returns JSON check results.
    Useful for machine-readable parsing in other bots.
    """
    import json
    observer = _get_observer()
    if observer is None:
        await update.message.reply_text("Observer unavailable.")
        return
    try:
        _, rows = observer.build_dashboard()
        text = json.dumps(rows, default=str, indent=2)
        # Wrap in code block for readability; Telegram caps at 4096 chars
        await update.message.reply_text(f"```\n{text[:3900]}\n```", parse_mode="Markdown")
    except Exception as exc:
        await update.message.reply_text(f"Error: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# Standalone quick-test
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    observer = _get_observer()
    if observer:
        print(observer.run(output="print"))
    else:
        print("NemoClaw Observer not available. Check installation.")
