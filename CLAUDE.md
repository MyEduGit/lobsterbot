# CLAUDE.md — lobsterbot

## Global rules in force

This repo inherits the following global Claude Code rules from
`~/.claude/CLAUDE.md` (installed by `mircea-constellation/setup/claude-doc/install.sh`):

- **DOC — Diagram-On-Completion.** Every completed job MUST be archived as a
  Mermaid diagram + full transcript into the Obsidian vault at
  `~/Documents/Obsidian/Jobs/`, mirrored to Notion ("Sovereign Dashboard"
  parent), and committed to `myedugit/mircea-constellation` under
  `/jobs/YYYY-MM-DD/<slug>/`. Jobs in *this* repo archive there too — one
  hub, cross-repo.
- **SE — Show Everything.** Surface every available action by name, name
  unknown capabilities, end substantive replies with a "What else" line.

Full text of both rules: `~/.claude/CLAUDE.md` after running the installer.
Canonical source: `myedugit/mircea-constellation @ setup/claude-doc/`.

## Project-specific notes

- `lobsterbot` is a minimal Node bot. Keep it minimal.
- `.env.example` is safe to read; `.env` is gitignored and must never be
  transcribed into archives or commits.
- The existing SessionStart hook (`.claude/hooks/session-start.sh`) handles
  `npm install` on session boot; don't duplicate that in DOC hooks.
