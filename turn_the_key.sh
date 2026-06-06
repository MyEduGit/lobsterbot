#!/usr/bin/env bash
# turn_the_key.sh — Activates the full UrantiOS AI pipeline on iMac M4 (local)
#
# Runs entirely on localhost. Requires:
#   - n8n running locally (npm/docker) at localhost:5678
#   - Ollama running locally at localhost:11434
#   - API keys in environment
#
# Usage:
#   export N8N_API_KEY="your-n8n-api-key"   # n8n Settings → API Keys
#   export OPENAI_API_KEY="sk-..."
#   export ANTHROPIC_API_KEY="sk-ant-..."
#   export GOOGLE_API_KEY="..."
#   export MISTRAL_API_KEY="..."
#   export GROQ_API_KEY="gsk_..."
#   export COHERE_API_KEY="..."
#   bash turn_the_key.sh
#
# Governed by UrantiOS — Truth · Beauty · Goodness

set -euo pipefail

N8N_BASE="http://localhost:5678"
N8N_API="${N8N_BASE}/api/v1"
OLLAMA_BASE="http://localhost:11434"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKFLOWS_DIR="${SCRIPT_DIR}/n8n/workflows"
COUNCIL_DIR="${WORKFLOWS_DIR}/council-of-seven"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RESET='\033[0m'; DIM='\033[2m'

log()  { echo -e "${BOLD}▶ $*${RESET}"; }
ok()   { echo -e "${GREEN}✓ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $*${RESET}"; }
fail() { echo -e "${RED}✗ $*${RESET}"; exit 1; }
sep()  { echo -e "${DIM}────────────────────────────────────────────────${RESET}"; }

sep
echo -e "${BOLD}  UrantiOS Pipeline — Activation Sequence (iMac M4)${RESET}"
sep

# ── Preflight ─────────────────────────────────────────────────────────────────
log "Preflight checks"

[[ -z "${N8N_API_KEY:-}" ]] && fail "N8N_API_KEY not set. Go to n8n → Settings → API Keys → Generate."
command -v jq  >/dev/null || fail "jq not found: brew install jq"
command -v curl >/dev/null || fail "curl not found: brew install curl"

[[ ! -f "${WORKFLOWS_DIR}/01-health-check.json" ]] && \
  fail "Workflow files missing at ${WORKFLOWS_DIR}. Run: cd ~/lobsterbot && git pull"

ok "Preflight passed"

# ── Step 1: Verify n8n ────────────────────────────────────────────────────────
sep
log "Step 1 — Checking n8n at localhost:5678"

if ! curl -sf "${N8N_BASE}/healthz" >/dev/null 2>&1; then
  echo ""
  warn "n8n is not running. Start it now:"
  echo ""
  echo "  Option A — npx (fastest):"
  echo "    N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false npx n8n"
  echo ""
  echo "  Option B — Docker:"
  echo "    docker run -d --name n8n -p 5678:5678 \\"
  echo "      -v ~/.n8n:/home/node/.n8n \\"
  echo "      n8nio/n8n"
  echo ""
  echo "  Option C — brew:"
  echo "    brew install n8n && n8n start"
  echo ""
  echo "Then re-run this script."
  exit 1
fi
ok "n8n is running"

# ── Step 2: Verify Ollama ─────────────────────────────────────────────────────
sep
log "Step 2 — Checking Ollama at localhost:11434"

if curl -sf "${OLLAMA_BASE}/api/tags" >/dev/null 2>&1; then
  MODELS=$(curl -sf "${OLLAMA_BASE}/api/tags" | jq -r '.models[].name' | tr '\n' ' ')
  ok "Ollama running. Models: ${MODELS:-none loaded}"
  if ! echo "$MODELS" | grep -q "qwen2.5"; then
    warn "qwen2.5:32b not found. Pulling now (large download)..."
    ollama pull qwen2.5:32b || warn "Pull failed — Spirit VII will abstain until model is available"
  fi
else
  warn "Ollama not running. Spirit VII (local synthesis) will abstain."
  warn "To start: ollama serve   (then: ollama pull qwen2.5:32b)"
fi

# ── Step 3: Import workflows ──────────────────────────────────────────────────
sep
log "Step 3 — Importing workflows"

import_workflow() {
  local file="$1"
  local name
  name=$(jq -r '.name' "$file")
  log "  Importing: ${name}"

  existing=$(curl -sf \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    "${N8N_API}/workflows?limit=100" \
    | jq -r --arg n "$name" '.data[] | select(.name==$n) | .id' 2>/dev/null || true)

  if [[ -n "$existing" ]]; then
    warn "  Exists (id=${existing}) — updating"
    curl -sf -X PUT \
      -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
      -H "Content-Type: application/json" \
      "${N8N_API}/workflows/${existing}" \
      -d @"$file" >/dev/null && ok "  Updated: ${name}" || warn "  Update failed"
    echo "$existing"
  else
    id=$(curl -sf -X POST \
      -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
      -H "Content-Type: application/json" \
      "${N8N_API}/workflows" \
      -d @"$file" | jq -r '.id')
    ok "  Created: ${name} (id=${id})"
    echo "$id"
  fi
}

HEALTH_ID=$(import_workflow "${WORKFLOWS_DIR}/01-health-check.json")
ROUTER_ID=$(import_workflow "${WORKFLOWS_DIR}/02-ai-router.json")
ENSEMBLE_ID=$(import_workflow "${WORKFLOWS_DIR}/03-ai-ensemble.json")
COUNCIL_ID=$(import_workflow "${COUNCIL_DIR}/workflow_scaffold.json")

# ── Step 4: Add credentials ───────────────────────────────────────────────────
sep
log "Step 4 — Registering API credentials in n8n"

add_credential() {
  local type="$1"; local name="$2"; local data="$3"
  existing=$(curl -sf \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    "${N8N_API}/credentials?limit=100" \
    | jq -r --arg n "$name" '.data[] | select(.name==$n) | .id' 2>/dev/null || true)
  if [[ -n "$existing" ]]; then
    warn "  Credential '${name}' already exists — skipping"
    return
  fi
  curl -sf -X POST \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    -H "Content-Type: application/json" \
    "${N8N_API}/credentials" \
    -d "{\"name\":\"${name}\",\"type\":\"${type}\",\"data\":${data}}" >/dev/null \
    && ok "  Added: ${name}" \
    || warn "  Failed to add ${name} (add manually in n8n UI if needed)"
}

[[ -n "${OPENAI_API_KEY:-}" ]]    && add_credential "openAiApi"       "OpenAI API"    "{\"apiKey\":\"${OPENAI_API_KEY}\"}"
[[ -n "${ANTHROPIC_API_KEY:-}" ]] && add_credential "anthropicApi"    "Anthropic API" "{\"apiKey\":\"${ANTHROPIC_API_KEY}\"}"
[[ -n "${GOOGLE_API_KEY:-}" ]]    && add_credential "googlePalmApi"   "Google AI"     "{\"apiKey\":\"${GOOGLE_API_KEY}\"}"
[[ -n "${MISTRAL_API_KEY:-}" ]]   && add_credential "mistralCloudApi" "Mistral AI"    "{\"apiKey\":\"${MISTRAL_API_KEY}\"}"
[[ -n "${GROQ_API_KEY:-}" ]]      && add_credential "groqApi"         "Groq"          "{\"apiKey\":\"${GROQ_API_KEY}\"}"
[[ -n "${COHERE_API_KEY:-}" ]]    && add_credential "cohereApi"       "Cohere"        "{\"apiKey\":\"${COHERE_API_KEY}\"}"
add_credential "ollamaApi" "Ollama Local" "{\"baseUrl\":\"${OLLAMA_BASE}\"}"

# ── Step 5: Activate ──────────────────────────────────────────────────────────
sep
log "Step 5 — Activating workflows"

activate_workflow() {
  local id="$1"; local name="$2"
  curl -sf -X POST \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    "${N8N_API}/workflows/${id}/activate" >/dev/null \
    && ok "  Activated: ${name}" \
    || warn "  Could not activate ${name} — check credentials in n8n UI"
}

activate_workflow "$HEALTH_ID"   "Health Check"
activate_workflow "$ROUTER_ID"   "AI Router"
activate_workflow "$ENSEMBLE_ID" "AI Ensemble"
activate_workflow "$COUNCIL_ID"  "Council of Seven"

# ── Step 6: Smoke tests ───────────────────────────────────────────────────────
sep
log "Step 6 — Smoke tests"

echo ""
log "  Health check (all 7 providers)..."
HEALTH=$(curl -sf -X POST "${N8N_BASE}/webhook/health-check" \
  -H "Content-Type: application/json" -d '{"test":true}' 2>&1 \
  || echo '{"error":"not responding yet — wait 10s and retry"}')
echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"

echo ""
log "  AI Router — fast query (Groq/Llama)..."
ROUTER=$(curl -sf -X POST "${N8N_BASE}/webhook/ai-router" \
  -H "Content-Type: application/json" \
  -d '{"query":"Define morontia in one sentence","task_type":"fast"}' 2>&1 \
  || echo '{"error":"router not responding"}')
echo "$ROUTER" | jq -r '.response // .text // .' 2>/dev/null || echo "$ROUTER"

# ── Step 7: Council of Seven ──────────────────────────────────────────────────
sep
log "Step 7 — Convening Council of Seven"

if command -v python3 >/dev/null && [[ -f "${SCRIPT_DIR}/council_demo.py" ]]; then
  python3 "${SCRIPT_DIR}/council_demo.py" \
    "Should the n8n AI pipeline be granted standing authority to publish Urantia Book summaries to Telegram without per-message approval from Mircea?"
else
  COUNCIL=$(curl -sf -X POST "${N8N_BASE}/webhook/council-of-seven" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "Should the n8n AI pipeline be granted standing authority to publish Urantia Book summaries to Telegram without per-message approval from Mircea?",
      "convene_reason": "activation_test"
    }' 2>&1 || echo '{"error":"council not responding"}')
  echo "$COUNCIL" | jq . 2>/dev/null || echo "$COUNCIL"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
sep
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║    UrantiOS Pipeline — ACTIVE on iMac M4            ║"
echo "  ║                                                      ║"
echo "  ║  Router    → POST localhost:5678/webhook/ai-router   ║"
echo "  ║  Ensemble  → POST localhost:5678/webhook/ai-ensemble ║"
echo "  ║  Council   → POST localhost:5678/webhook/council-... ║"
echo "  ║  Health    → POST localhost:5678/webhook/health-check║"
echo "  ║                                                      ║"
echo "  ║  Spirit VII (Ollama) → localhost:11434               ║"
echo "  ║                                                      ║"
echo "  ║  Governed by UrantiOS — Truth · Beauty · Goodness   ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${RESET}"
sep
