# n8n Credentials Setup — 7 AI Providers

## Access n8n
```bash
ssh -L 5678:localhost:5678 mircea@46.225.51.30
# Open: http://localhost:5678
# Login: mircea@nemoclaw.local
```

## Add Each Credential

**Settings → Credentials → Add credential → search provider name**

### 1. OpenAI
- Type: **OpenAI API**
- Key: `platform.openai.com/api-keys`
- Name: `OpenAI API`

### 2. Anthropic
- Type: **Anthropic API**
- Key: `console.anthropic.com`
- Name: `Anthropic API`

### 3. Google Gemini
- Type: **Google PaLM API** ← exact type name for Gemini nodes
- Key: `aistudio.google.com` → Get API key
- Name: `Google AI`

### 4. Mistral
- Type: **Mistral Cloud API**
- Key: `console.mistral.ai`
- Name: `Mistral AI`

### 5. Groq
- Type: **Groq API**
- Key: `console.groq.com` (free tier available)
- Name: `Groq`

### 6. Ollama (no API key)
- Type: **Ollama API**
- Base URL: `http://204.168.143.98:11434`
- Name: `Ollama Local`
- Already running qwen2.5:32b on URANTiOS

### 7. Cohere
- Type: **Cohere API**
- Key: `dashboard.cohere.com`
- Name: `Cohere`

## After Import

Click each model node in the workflow → assign the correct credential from the dropdown.

## Verify

Run `01-health-check.json` → should return:
```json
{ "total": 7, "online": 7, "summary": "OpenAI: online | ..." }
```

## Troubleshoot

| Issue | Fix |
|-------|-----|
| Ollama timeout | `curl http://204.168.143.98:11434/api/tags` from Hetzner |
| Gemini 403 | Use `Google PaLM API` type, not OAuth |
| Cohere 401 | Check key at dashboard.cohere.com → API Keys |
| Credential mismatch after import | Click model node → reassign credential |
| Groq rate limit | Free: 30 req/min — add Wait node if needed |
