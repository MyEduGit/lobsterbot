#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# NemoClaw Observer — lobsterbot-side smoke test
#
# Installs dependencies and runs telegram_handler.py's __main__ block,
# which prints the full dashboard (without hitting Telegram). Use this to
# verify the environment before wiring /dashboard into the live bot.
#
#   ./run.sh
#
# Environment:
#   NEMO_VENV       path to venv (default ./.venv)
#   SIBLING_PATH    path to mircea-constellation checkout (optional override)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

NEMO_VENV="${NEMO_VENV:-$HERE/.venv}"

if ! command -v python3 >/dev/null 2>&1; then
    echo "ERROR: python3 not found." >&2
    exit 1
fi

if [ ! -d "$NEMO_VENV" ]; then
    echo ">> Creating venv at $NEMO_VENV"
    python3 -m venv "$NEMO_VENV"
fi
# shellcheck disable=SC1091
source "$NEMO_VENV/bin/activate"

echo ">> Installing requirements"
pip install --quiet --upgrade pip
pip install --quiet -r "$HERE/requirements.txt"

# Load .env if present (shared with the core observer)
if [ -f "$HERE/.env" ]; then
    # shellcheck disable=SC1091
    set -a; . "$HERE/.env"; set +a
fi

# Make sibling mircea-constellation checkout importable if present
SIBLING_PATH="${SIBLING_PATH:-$HERE/../../mircea-constellation/nemoclaw_observer}"
if [ -d "$SIBLING_PATH" ]; then
    export PYTHONPATH="$SIBLING_PATH:${PYTHONPATH:-}"
fi

python3 telegram_handler.py
