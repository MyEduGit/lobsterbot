# lobsterbot

**OpenClaw Telegram bridge** — a small, read-only Telegram bot that lets a
single authorized operator see system state on a host (host label, uptime,
load, memory, disk, docker containers, listening ports, journald tail, HTTP
probe).

Designed to run on the Hetzner **OpenClaw** box (`46.225.51.30`), but will run
on any Linux host with `node` >= 18 and a `TELEGRAM_BOT_TOKEN`.

Part of **Mircea's Constellation**, governed by **UrantiOS** — Truth, Beauty,
Goodness.

## Why this exists

The existing Telegram fleet had bots that were spamming ("Nebadon Bridge"
looping "online" messages, `MirNeMoClaw_bot` repeating "No proof directory for
today", `NanoClaw` flooding "Invalid API key"). `lobsterbot` is the opposite of
that — a quiet, single-operator, read-only window into the box, with no
background chatter, no cron spam, no write paths.

## Design rules

1. **Read-only.** No command here writes state, restarts services, or edits
   files. No free-form shell.
2. **Whitelist-only.** The bot refuses any Telegram user ID not in
   `TELEGRAM_ALLOWED_USER_IDS`. If the whitelist is empty, the bot refuses to
   start.
3. **Quiet.** No periodic messages, no alerts, no unsolicited traffic. It
   speaks only when spoken to.
4. **Truth over convenience.** Command output is shown verbatim (monospace),
   truncated only when it would exceed Telegram's 4096-char limit.

## Commands

| Command | What it does |
| --- | --- |
| `/status` | Host, kernel, uptime, load, memory, disk summary |
| `/uptime` | `uptime` |
| `/mem` | `free -h` |
| `/disk` | `df -hT` (excluding tmpfs) |
| `/docker` | `docker ps` |
| `/svc` | `systemd-cgtop -n 1 -b --depth=2` |
| `/ports` | `ss -tlnp` |
| `/ping URL` | HTTP HEAD probe (http/https only) |
| `/logs [N]` | Last N lines of `journalctl` (default 30, max 200) |
| `/who` | `whoami` + `id` |
| `/help` | List of commands |

## Local setup (M1 Mac)

```bash
./setup/m1_terminal.sh
cp .env.example .env
# fill in TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_USER_IDS
npm install
npm start
```

## Deploying on OpenClaw (Hetzner)

As the `mircea` user on `46.225.51.30`:

```bash
# one-time install (clones repo into /opt/lobsterbot, sets up node, systemd unit)
curl -fsSL https://raw.githubusercontent.com/MyEduGit/lobsterbot/main/setup/openclaw_install.sh | sudo -E bash

# edit secrets
sudo -e /etc/lobsterbot.env
# at minimum set:
#   TELEGRAM_BOT_TOKEN=...
#   TELEGRAM_ALLOWED_USER_IDS=828807562

# start it
sudo systemctl enable --now lobsterbot
sudo systemctl status lobsterbot
journalctl -u lobsterbot -f
```

Then open Telegram, find the bot, and send `/start`. Only user IDs in
`TELEGRAM_ALLOWED_USER_IDS` will get a response — everyone else sees
`Not authorized.`

## Notes

- `docker`, `systemd-cgtop`, `ss`, and `journalctl` may require the bot's user
  to be in `docker` / `systemd-journal` groups, or to be run as root. The
  `openclaw_install.sh` script installs it as a system service running as
  `root` because the whole point is to observe the host. If you'd prefer an
  unprivileged user, edit `setup/lobsterbot.service` to set `User=mircea` and
  add that user to `docker` and `systemd-journal`.
- This bot deliberately does **not** include `/exec`, `/restart`, `/update`,
  or anything that can change the box. Write operations belong to a different
  bot, behind a different token, with its own audit trail.
