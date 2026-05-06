#!/usr/bin/env bash
# iMac M4 Terminal Setup - Hermes agent / LobsterBot
# UrantiOS governed - Truth, Beauty, Goodness
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

echo ""
echo "================================================="
echo "  iMac M4 Terminal Setup - Hermes / LobsterBot"
echo "================================================="
echo ""

if [ "$(uname -s)" != "Darwin" ]; then
  warn "This installer is intended for macOS on iMac M4."
fi

if [ "$(uname -m)" != "arm64" ]; then
  warn "This installer is intended for Apple Silicon arm64."
fi

# -- 1. Homebrew -------------------------------------------------------------
info "[1/4] Homebrew (arm64)..."
if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
  ok "Homebrew installed."
else
  brew update --quiet
  ok "Homebrew up to date."
fi

# -- 2. Node.js (arm64 native) -----------------------------------------------
info "[2/4] Node.js (arm64 native)..."
brew install node || true
ok "node: $(node --version)  npm: $(npm --version)"

# -- 3. Project dependencies -------------------------------------------------
info "[3/4] npm install..."
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$REPO_DIR/package.json" ]; then
  cd "$REPO_DIR" && npm install
  ok "Dependencies installed."
else
  warn "package.json not found at $REPO_DIR - skipping npm install."
fi

# -- 4. Environment file -----------------------------------------------------
info "[4/4] .env setup..."
if [ ! -f "$REPO_DIR/.env" ]; then
  if [ -f "$REPO_DIR/.env.example" ]; then
    cp "$REPO_DIR/.env.example" "$REPO_DIR/.env"
    ok ".env created from .env.example - fill in your secrets."
  else
    cat > "$REPO_DIR/.env" << 'ENVEOF'
# LobsterBot environment variables
# TELEGRAM_BOT_TOKEN=
ENVEOF
    ok ".env stub created - add your TELEGRAM_BOT_TOKEN."
  fi
else
  ok ".env already exists."
fi

echo ""
echo "================================================="
echo "  Hermes agent installed on iMAC_M4."
echo ""
echo "  Next steps:"
echo "  1.  Fill in $REPO_DIR/.env"
echo "  2.  node index.js"
echo "================================================="
echo ""
