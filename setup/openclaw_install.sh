#!/usr/bin/env bash
# lobsterbot — OpenClaw installer
#
# Installs lobsterbot as a systemd service on a Debian/Ubuntu host (like the
# Hetzner OpenClaw box at 46.225.51.30). Idempotent — safe to re-run.
#
# Usage (as root or with sudo):
#   curl -fsSL https://raw.githubusercontent.com/MyEduGit/lobsterbot/main/setup/openclaw_install.sh | sudo -E bash
# or:
#   sudo bash setup/openclaw_install.sh
#
# UrantiOS governed — Truth, Beauty, Goodness.

set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Run this as root (sudo bash ...)"

REPO_URL="https://github.com/MyEduGit/lobsterbot.git"
INSTALL_DIR="/opt/lobsterbot"
ENV_FILE="/etc/lobsterbot.env"
SERVICE_NAME="lobsterbot"
BRANCH="${LOBSTERBOT_BRANCH:-main}"

echo ""
echo "================================================="
echo "  lobsterbot installer — OpenClaw"
echo "  branch: $BRANCH"
echo "================================================="
echo ""

# ── 1. System packages ───────────────────────────────────────────────────────
info "[1/5] apt packages (git, curl, ca-certificates)..."
apt-get update -qq
apt-get install -y -qq git curl ca-certificates >/dev/null
ok "apt packages ready."

# ── 2. Node.js 20.x LTS ──────────────────────────────────────────────────────
info "[2/5] Node.js >= 18..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//;s/\..*//')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs >/dev/null
fi
ok "node: $(node -v)   npm: $(npm -v)"

# ── 3. Clone / update repo ───────────────────────────────────────────────────
info "[3/5] repo at $INSTALL_DIR..."
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" fetch --quiet origin
  git -C "$INSTALL_DIR" checkout --quiet "$BRANCH"
  git -C "$INSTALL_DIR" pull --quiet --ff-only origin "$BRANCH"
else
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
npm install --omit=dev --silent
ok "repo synced, deps installed."

# ── 4. Environment file ──────────────────────────────────────────────────────
info "[4/5] env file at $ENV_FILE..."
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'ENVEOF'
# lobsterbot — production env
# Fill these in, then: sudo systemctl restart lobsterbot
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USER_IDS=828807562
LOBSTERBOT_HOST_LABEL=OpenClaw
LOBSTERBOT_INSTANCE=openclaw
ENVEOF
  chmod 600 "$ENV_FILE"
  warn "$ENV_FILE created empty — edit it and set TELEGRAM_BOT_TOKEN."
else
  ok "$ENV_FILE already exists (left untouched)."
fi

# ── 5. systemd unit ──────────────────────────────────────────────────────────
info "[5/5] systemd unit..."
install -m 644 "$INSTALL_DIR/setup/lobsterbot.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload

# Only enable; don't auto-start if the env file is still empty.
systemctl enable "${SERVICE_NAME}.service" >/dev/null 2>&1 || true

if grep -q '^TELEGRAM_BOT_TOKEN=.\+' "$ENV_FILE"; then
  systemctl restart "${SERVICE_NAME}.service"
  sleep 1
  systemctl --no-pager --full status "${SERVICE_NAME}.service" | head -n 20 || true
  ok "lobsterbot running."
else
  warn "TELEGRAM_BOT_TOKEN not set — leaving service stopped."
  warn "Edit $ENV_FILE, then: systemctl start ${SERVICE_NAME}"
fi

echo ""
echo "================================================="
echo "  Install complete."
echo ""
echo "  Edit secrets:     sudoedit $ENV_FILE"
echo "  Start:            systemctl start ${SERVICE_NAME}"
echo "  Follow logs:      journalctl -u ${SERVICE_NAME} -f"
echo "  Status:           systemctl status ${SERVICE_NAME}"
echo "================================================="
