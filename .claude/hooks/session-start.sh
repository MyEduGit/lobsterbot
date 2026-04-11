#!/bin/bash
# SessionStart hook — lobsterbot
# Installs Node.js dependencies on every session start.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

# ── Node.js dependencies ────────────────────────────────────────────────────
if command -v npm &>/dev/null; then
  echo "[session-start] npm install..."
  npm install --prefer-offline --no-audit --no-fund 2>&1
  echo "[session-start] npm install complete."
else
  echo "[session-start] WARN: npm not found — skipping install."
fi

# ── .env stub ───────────────────────────────────────────────────────────────
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "[session-start] Created .env from .env.example"
elif [ ! -f .env ]; then
  touch .env
  echo "[session-start] Created empty .env stub"
fi
