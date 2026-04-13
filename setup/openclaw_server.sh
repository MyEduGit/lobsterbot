#!/usr/bin/env bash
# OpenClaw Server Setup — LobsterBot
# Target host: Hetzner CPX22 — 46.225.51.30 (Nuremberg, DE), user: mircea
# UrantiOS governed — Truth, Beauty, Goodness
#
# Installs Node.js, clones/updates LobsterBot, and installs a systemd unit so
# the bot starts on boot and restarts on failure. Idempotent: safe to re-run.
#
# Usage (on OpenClaw as user `mircea`):
#   bash setup/openclaw_server.sh
#
# Secrets: edit ~/lobsterbot/.env after the first run and restart the service:
#   sudo systemctl restart lobsterbot

set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

REPO_URL="https://github.com/myedugit/lobsterbot.git"
REPO_DIR="${HOME}/lobsterbot"
SERVICE_NAME="lobsterbot"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NODE_MAJOR="20"

echo ""
echo "================================================="
echo "  OpenClaw Server Setup — LobsterBot"
echo "  Host: 46.225.51.30  User: $(id -un)"
echo "  Governed by: Truth · Beauty · Goodness"
echo "================================================="
echo ""

[ "$(id -un)" != "root" ] || fail "Do not run as root. Run as 'mircea'; sudo is used where needed."
command -v sudo >/dev/null || fail "sudo is required."

# ── 1. Node.js (NodeSource LTS) ─────────────────────────────────────────────
info "[1/5] Node.js ${NODE_MAJOR}.x..."
if ! command -v node >/dev/null || ! node --version | grep -q "^v${NODE_MAJOR}\."; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
fi
ok "node: $(node --version)  npm: $(npm --version)"

# ── 2. Clone / refresh repo ─────────────────────────────────────────────────
info "[2/5] Syncing repo to ${REPO_DIR}..."
if [ ! -d "${REPO_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${REPO_DIR}"
  ok "Cloned."
else
  git -C "${REPO_DIR}" pull --ff-only || warn "Could not fast-forward — leaving working tree as-is."
  ok "Repo up to date."
fi

# ── 3. npm install ──────────────────────────────────────────────────────────
info "[3/5] npm install (production)..."
cd "${REPO_DIR}"
npm install --omit=dev
ok "Dependencies installed."

# ── 4. .env stub ────────────────────────────────────────────────────────────
info "[4/5] .env setup..."
if [ ! -f "${REPO_DIR}/.env" ]; then
  if [ -f "${REPO_DIR}/.env.example" ]; then
    cp "${REPO_DIR}/.env.example" "${REPO_DIR}/.env"
    chmod 600 "${REPO_DIR}/.env"
    warn ".env created from .env.example — fill in TELEGRAM_BOT_TOKEN before first run."
  else
    warn ".env.example not found; please create ${REPO_DIR}/.env manually."
  fi
else
  ok ".env already present."
fi

# ── 5. systemd service ──────────────────────────────────────────────────────
info "[5/5] systemd unit ${SERVICE_NAME}..."
sudo tee "${SERVICE_FILE}" >/dev/null << SVCEOF
[Unit]
Description=LobsterBot (UrantiOS governed — Truth, Beauty, Goodness)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$(id -un)
WorkingDirectory=${REPO_DIR}
EnvironmentFile=-${REPO_DIR}/.env
ExecStart=$(command -v node) ${REPO_DIR}/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1 || true

# Only start if .env has a token; otherwise leave it enabled-but-stopped.
if grep -Eq '^TELEGRAM_BOT_TOKEN=.+' "${REPO_DIR}/.env" 2>/dev/null; then
  sudo systemctl restart "${SERVICE_NAME}"
  sleep 1
  if systemctl is-active --quiet "${SERVICE_NAME}"; then
    ok "${SERVICE_NAME} is running."
  else
    warn "${SERVICE_NAME} failed to start — see: journalctl -u ${SERVICE_NAME} -n 50"
  fi
else
  warn "TELEGRAM_BOT_TOKEN not set in .env — service enabled but NOT started."
  warn "Fill in .env and run: sudo systemctl start ${SERVICE_NAME}"
fi

echo ""
echo "================================================="
echo "  LobsterBot OpenClaw Setup Complete"
echo "================================================="
echo ""
echo "  Repo:      ${REPO_DIR}"
echo "  Service:   ${SERVICE_NAME}"
echo "  Logs:      journalctl -u ${SERVICE_NAME} -f"
echo "  Restart:   sudo systemctl restart ${SERVICE_NAME}"
echo ""
echo "  UrantiOS governed — Truth, Beauty, Goodness"
echo ""
