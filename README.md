# LobsterBot — n8n AI Provider Integration Hub

Central automation hub for NemoClaw. Hosts n8n workflows connecting 7 AI providers.

## Infrastructure
- **n8n**: Docker container `nemoclaw-n8n` on Hetzner (46.225.51.30:5678)
- **SSH Tunnel**: `ssh -L 5678:localhost:5678 mircea@46.225.51.30`
- **Login**: mircea@nemoclaw.local

## 7 AI Providers

| # | Provider | Model | task_type | n8n Credential |
|---|----------|-------|-----------|----------------|
| 1 | **OpenAI** | gpt-4o | `code` | `openAiApi` |
| 2 | **Anthropic** | claude-sonnet-4-6 | `creative` | `anthropicApi` |
| 3 | **Google Gemini** | gemini-2.0-flash | `research` | `googlePalmApi` |
| 4 | **Mistral** | mistral-large-latest | `analysis` | `mistralCloudApi` |
| 5 | **Groq** | llama-3.3-70b-versatile | `fast` | `groqApi` |
| 6 | **Ollama** | qwen2.5:32b | `local` | `ollamaApi` |
| 7 | **Cohere** | command-r-plus | `search` | `cohereApi` |

## Workflows

Import from `n8n/workflows/` via **n8n UI → Workflows → Import from JSON**:

| File | Trigger | Purpose |
|------|---------|---------|
| `01-health-check.json` | Manual | Tests all 7 providers, returns status report |
| `02-ai-router.json` | `POST /webhook/ai-router` | Routes by `task_type` to best provider |
| `03-ai-ensemble.json` | `POST /webhook/ai-ensemble` | Parallel responses from 3 providers |

## Quick Test

```bash
# Fast answer via Groq (~50ms)
curl -X POST http://localhost:5678/webhook/ai-router \
  -H "Content-Type: application/json" \
  -d '{"query": "What is consciousness?", "task_type": "fast"}'

# Creative via Claude
curl -X POST http://localhost:5678/webhook/ai-router \
  -H "Content-Type: application/json" \
  -d '{"query": "Write a haiku about The Urantia Book", "task_type": "creative"}'

# Ensemble — 3 providers in parallel
curl -X POST http://localhost:5678/webhook/ai-ensemble \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Triune Monism?"}'
```

## Setup
1. See `n8n/setup/credentials-guide.md`
2. Import the 3 workflow JSON files into n8n
3. Run health check to verify all 7 providers respond
4. Activate Router and Ensemble workflows

---
*Governed by UrantiOS — Truth · Beauty · Goodness*
