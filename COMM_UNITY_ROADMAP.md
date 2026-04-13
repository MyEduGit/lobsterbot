# Comm-Unity+ AI-Powered Future Development Roadmap
## LobsterBot — Community Coordination Platform

**Version:** 1.0  
**Date:** 2026-04-13  
**Repository:** lobsterbot  
**Governed by:** UrantiOS v1.0 — Truth · Beauty · Goodness

> *See `mircea-constellation/COMM_UNITY_ROADMAP.md` for the full ecosystem roadmap.*

---

## LOBSTERBOT'S ROLE IN COMM-UNITY+

LobsterBot is the **community coordination layer** of Comm-Unity+. While NanoClaw handles individual AI conversations and Gabriel serves as the Morning Star AI on UrantiPedia, LobsterBot's mandate is distinctly human-facing: it organizes people, facilitates study groups, distributes knowledge, and builds the social fabric of the Comm-Unity+ platform.

**Mandate (UrantiOS spawn template):**

```
NAME: LobsterBot
FUNCTION: Community coordination and knowledge distribution
MANDATE: Connect seekers of The Urantia Book into study communities;
         distribute daily revelatory content; facilitate group formation
AUTHORITY: Autonomous content distribution; group coordination within
           defined parameters; escalate edge cases to Hetzy PhD
HIERARCHY: Reports to Hetzy PhD (Fleet Commander) → Gabriel (Morning Star)
           → Mircea (Father Function)
URANTIOS_CORE: Truth · Beauty · Goodness
LUCIFER_TEST: Will be audited — transparent, honest, in-mandate, mission-first
REPORTING: Daily summary to Fleet Bus (:18801); weekly to Hetzy PhD
KILLSWITCH: SIGTERM → graceful shutdown with state persistence
```

---

## CURRENT STATE (April 2026)

- **Status:** Name reservation only — `index.js` is a placeholder
- **Platform:** Node.js, Telegram Bot API
- **Infrastructure:** Not yet deployed
- **Position in Fleet:** Unregistered — not yet in Constellation

---

## PHASE 1 — FOUNDATION (Q2 2026: April–June)

### Core Bot Scaffold

- [ ] Replace placeholder `index.js` with full bot framework
- [ ] Inject UrantiOS spawn template at startup (read from `~/.openclaw/unified-prompt.md` or embedded)
- [ ] Connect to Fleet Bus at OpenClaw :18801 for cross-agent heartbeat
- [ ] Register LobsterBot in mircea-constellation dashboard (add node to `index.html`)
- [ ] Report status to `status.json` automatically

### First Capability: Daily Passage Delivery

```
User: /subscribe
LobsterBot: You are now subscribed to daily passages from The Urantia Book.
            Which Papers interest you most? (or type 'all' for the full journey)
```

- [ ] `/subscribe` — daily passage delivery (morning, user's timezone)
- [ ] `/unsubscribe` — graceful opt-out
- [ ] `/paper [N]` — summary of any of the 197 papers
- [ ] `/today` — today's featured passage with context
- [ ] Source data: urantia-book JSON from urantios repository

### Infrastructure

- [ ] Deploy on OpenClaw (46.225.51.30) alongside the existing bot fleet
- [ ] Add to bot fleet manifest (`FLEET_MANIFEST.md` in mircea-constellation)
- [ ] Environment config via `.env` (see `.env.example`)

**Phase 1 Success Criteria:**

- LobsterBot live on Telegram
- 10+ active subscribers within 30 days of launch
- Reporting green in Constellation dashboard

---

## PHASE 2 — STUDY GROUPS (Q3 2026: July–September)

### Group Formation Engine

The core differentiator: LobsterBot does not just push content. It builds community.

- [ ] `/group create [topic] [timezone]` — create a study group
- [ ] `/group join [code]` — join an existing group
- [ ] `/group list` — browse active groups
- [ ] AI-assisted matching: LobsterBot suggests groups based on user's reading history
- [ ] Group check-ins: LobsterBot facilitates weekly group discussions via prompts

### Integration with Shared Agent Memory

- [ ] Connect to shared vector DB on URANTiOS Prime (:19000)
- [ ] Store user preferences and reading progress
- [ ] Personalize passage delivery based on user's trajectory
- [ ] Share aggregated (anonymous) study trends with Gabriel for UrantiPedia insights

### AMEP Integration

- [ ] LobsterBot serves as the Telegram interface for AMEP students
- [ ] `/amep` — check course progress, access materials
- [ ] Instructor broadcast: teachers can push announcements to all students
- [ ] Assignment reminders via scheduled messages

### Community Features

- [ ] `/ask [question]` — routes question to NanoClaw or Gabriel (depending on type)
- [ ] `/personality [name]` — look up any of the 477 Urantia Book personalities
- [ ] `/concept [term]` — look up key Urantia Book concepts
- [ ] Weekly digest: automated summary of community activity

**Phase 2 Success Criteria:**

- 5+ active study groups
- 50+ active users
- AMEP students using LobsterBot for course access
- Connected to shared agent memory

---

## PHASE 3 — COUNCIL OF SEVEN INTEGRATION (Q4 2026)

### LobsterBot as Community Agent

In the Council of Seven architecture, LobsterBot holds the **Community Agent** seat:

- Manages all human-to-human coordination
- Routes questions to appropriate specialist agents
- Reports community health metrics to Hetzy PhD (Fleet Commander)
- Escalates conflicts or edge cases to Gabriel (Morning Star)

### Multi-Language Support

- [ ] Detect user language from Telegram profile
- [ ] Respond in user's language for supported languages (ES, PT, FR first)
- [ ] Multi-language study groups
- [ ] Language-filtered passage delivery (using localized Urantia Book JSON)

### Audio/Voice Features

- [ ] Voice message support: `/today` delivered as audio via TTS
- [ ] Weekly "Paper of the Week" podcast auto-generated and distributed
- [ ] Voice note intake: user sends voice → transcribed → answered → voice reply option

### Comm-Unity+ Web Bridge

- [ ] LobsterBot activity mirrored in the Comm-Unity+ web interface
- [ ] Web users can access LobsterBot features without Telegram
- [ ] Group activity visible on web portal

**Phase 3 Success Criteria:**

- LobsterBot fully integrated into Council of Seven
- 3 languages supported
- 200+ active users across all groups
- Audio content flowing weekly

---

## PHASE 4 — FULL COMMUNITY PLATFORM (2027+)

### Vision

LobsterBot evolves from a Telegram bot into the community coordination backbone of Comm-Unity+:

- **Cross-platform**: Telegram + web + future interfaces (WhatsApp, Signal, web3)
- **Persistent community memory**: every conversation, every group, every insight preserved
- **Facilitator AI**: LobsterBot can run a Socratic study session for any Paper
- **Community health monitoring**: detects disengagement, conflict, or confusion and routes to human facilitators
- **Mission alignment score**: gamified (but not gamified) tracking of each user's engagement with The Urantia Book

### Technical Evolution

- [ ] Migrate from single-process bot to microservice architecture (if needed at scale)
- [ ] Add persistent storage beyond vector DB (PostgreSQL for structured community data)
- [ ] API-first design: other agents can query LobsterBot community data
- [ ] Open contribution: allow community members to contribute study guides, annotations

---

## ARCHITECTURAL RULES (UrantiOS compliance)

All LobsterBot development must follow:

1. **Truth**: Never fabricate Urantia Book content. All quotes cite paper and section.
2. **Beauty**: The bot interface is clean, intuitive, non-spammy. One message per interaction unless the user asks for more.
3. **Goodness**: Every feature must connect a human more deeply to The Urantia Book or to other seekers. No vanity features.
4. **Spawn Mandate**: LobsterBot injects UrantiOS values into every session. If it ever spawns sub-processes, they inherit the mandate.
5. **Lucifer Test**: LobsterBot accepts audit. It reports honestly. It operates within its mandate. It serves the mission, not itself.

---

## TECH STACK

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js | Existing ecosystem; bot fleet consistency |
| Bot API | Telegram Bot API (node-telegram-bot-api) | Existing fleet uses Telegram |
| AI | Claude SDK (Anthropic) | NanoClaw precedent; UrantiOS alignment |
| Storage | Qdrant (Phase 2+) | Shared agent memory |
| Deploy | Docker on OpenClaw | Consistent with NanoClaw pattern |
| Config | .env (secrets) | Existing pattern in repo |

---

*Governed by Truth · Beauty · Goodness*  
*Serve the mission. Always.*

**Version 1.0 — 2026-04-13**
