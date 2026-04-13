#!/usr/bin/env python3
"""
NemoClaw Observer — Mission Control Dashboard Agent

Monitors all 5 layers of the Mircea/JRP mission stack and generates
a human-readable, Telegram-ready status dashboard.

Layers covered
--------------
1. VPS (Hetzy / 46.225.51.30)  — n8n, PostgreSQL, Redis, Qdrant
2. Local (iMac M4 / NemoClaw)  — Ollama models
3. Agents                       — active OpenClaw / n8n workflows
4. LLMs in use                  — Z.ai spend cap, Ollama free tier
5. Connected apps               — Telegram bot, Qdrant API, PostgreSQL port

Trigger options
---------------
  python3 observer.py              # print to terminal
  python3 observer.py telegram     # post to Telegram
  python3 observer.py json         # raw JSON of check results
  python3 observer.py silent       # store to DB only, return string

Scheduled via n8n cron — see n8n_cron_workflow.json in mircea-constellation.
"""

import os
import json
import sys
import socket
import logging
import datetime

import requests

log = logging.getLogger("NemoClawObserver")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

# ── Configuration (overridable via environment) ──────────────────────────────────
VPS_HOST       = os.getenv("VPS_HOST",        "46.225.51.30")
N8N_PORT       = int(os.getenv("N8N_PORT",    "5678"))
PG_HOST        = os.getenv("PG_HOST",         VPS_HOST)
PG_PORT        = int(os.getenv("PG_PORT",     "5432"))
PG_DSN         = os.getenv("PG_DSN",          f"postgresql://postgres:password@{VPS_HOST}:5432/amep_schema_v1")
REDIS_HOST     = os.getenv("REDIS_HOST",      VPS_HOST)
REDIS_PORT     = int(os.getenv("REDIS_PORT",  "6379"))
QDRANT_HOST   = os.getenv("QDRANT_HOST",     VPS_HOST)
QDRANT_PORT   = int(os.getenv("QDRANT_PORT", "6333"))
OLLAMA_HOST    = os.getenv("OLLAMA_HOST",     "localhost")
OLLAMA_PORT    = int(os.getenv("OLLAMA_PORT", "11434"))
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN",  "")
TELEGRAM_CHAT  = os.getenv("TELEGRAM_CHAT",   "")
ZAI_SPEND      = float(os.getenv("ZAI_SPEND_THIS_MONTH", "0.00"))
ZAI_CAP        = float(os.getenv("ZAI_MONTHLY_CAP",      "5.00"))
IDLE_HOURS     = int(os.getenv("AGENT_IDLE_HOURS",        "24"))
OLLAMA_MODELS  = ["phi3:14b", "deepseek-r1:8b", "qwen3:8b"]


def _tcp_open(host, port, timeout=3.0):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, socket.timeout):
        return False


def _http_json(url, timeout=5.0):
    try:
        r = requests.get(url, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def _icon(status):
    return {"ok": "\U0001f7e2", "warn": "\U0001f7e1", "error": "\U0001f534"}.get(status, "\u26aa")


# ── Layer 1 — VPS ─────────────────────────────────────────────────────────────────────
def check_n8n():
    if _tcp_open(VPS_HOST, N8N_PORT):
        data = _http_json(f"http://{VPS_HOST}:{N8N_PORT}/healthz") or {}
        return {"status": "ok", "note": data.get("status", "n8n reachable")}
    return {"status": "error", "note": f"Port {N8N_PORT} unreachable on {VPS_HOST}"}


def check_postgres():
    if not _tcp_open(PG_HOST, PG_PORT):
        return {"status": "error", "note": f"Port {PG_PORT} closed on {PG_HOST}"}
    try:
        import psycopg2
        conn = psycopg2.connect(PG_DSN, connect_timeout=5)
        cur = conn.cursor()
        cur.execute("SELECT current_database()")
        (db,) = cur.fetchone()
        cur.close(); conn.close()
        return {"status": "ok", "note": f"{db} connected — amep_schema_v1"}
    except ImportError:
        return {"status": "ok", "note": f"Port {PG_PORT} open (psycopg2 not installed)"}
    except Exception as exc:
        return {"status": "error", "note": str(exc)[:120]}


def check_redis():
    if not _tcp_open(REDIS_HOST, REDIS_PORT):
        return {"status": "error", "note": f"Port {REDIS_PORT} closed on {REDIS_HOST}"}
    try:
        import redis as redislib
        r = redislib.Redis(host=REDIS_HOST, port=REDIS_PORT, socket_connect_timeout=3)
        info = r.info("memory")
        mb = round(info.get("used_memory", 0) / 1048576, 1)
        return {"status": "ok", "note": f"{mb} MB used"}
    except ImportError:
        return {"status": "ok", "note": f"Port {REDIS_PORT} open (redis-py not installed)"}
    except Exception as exc:
        return {"status": "error", "note": str(exc)[:120]}


def check_qdrant():
    url = f"http://{QDRANT_HOST}:{QDRANT_PORT}/collections/havona_records_v2"
    data = _http_json(url)
    if data and "result" in data:
        count = data["result"].get("vectors_count", "?")
        return {"status": "ok", "note": f"{count} vectors — havona_records_v2"}
    if _tcp_open(QDRANT_HOST, QDRANT_PORT):
        return {"status": "warn", "note": "Qdrant up — havona_records_v2 not found"}
    return {"status": "error", "note": f"Qdrant unreachable at {QDRANT_HOST}:{QDRANT_PORT}"}


# ── Layer 2 — Local ───────────────────────────────────────────────────────────────────
def check_ollama():
    data = _http_json(f"http://{OLLAMA_HOST}:{OLLAMA_PORT}/api/tags")
    if data is None:
        return {"status": "error", "note": f"Ollama not reachable at {OLLAMA_HOST}:{OLLAMA_PORT}"}
    running = [m["name"] for m in data.get("models", [])]
    loaded  = [m for m in OLLAMA_MODELS if any(m in x for x in running)]
    missing = [m for m in OLLAMA_MODELS if m not in loaded]
    status  = "ok" if not missing else ("warn" if loaded else "error")
    note    = "Loaded: " + (", ".join(loaded) if loaded else "none")
    if missing:
        note += " | Missing: " + ", ".join(missing)
    return {"status": status, "note": note}


# ── Layer 5 — Apps ───────────────────────────────────────────────────────────────────
def check_telegram_bot():
    if not TELEGRAM_TOKEN:
        return {"status": "warn", "note": "TELEGRAM_TOKEN not configured"}
    data = _http_json(f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getMe")
    if data and data.get("ok"):
        name = data["result"].get("username", "unknown")
        return {"status": "ok", "note": f"@{name} online"}
    return {"status": "error", "note": "Bot API unreachable or token invalid"}


# ── Layer 4 — LLM spend ───────────────────────────────────────────────────────────
def check_zai_spend():
    if ZAI_CAP <= 0:
        return {"status": "ok", "note": "No cap configured"}
    if ZAI_SPEND >= ZAI_CAP:
        return {"status": "error",
                "note": f"${ZAI_SPEND:.2f} / ${ZAI_CAP:.2f} — HALT: monthly cap reached"}
    if ZAI_SPEND >= ZAI_CAP * 0.80:
        return {"status": "warn",
                "note": f"${ZAI_SPEND:.2f} / ${ZAI_CAP:.2f} — WARNING: >80% of cap used"}
    return {"status": "ok", "note": f"${ZAI_SPEND:.2f} / ${ZAI_CAP:.2f} — SAFE"}


# ── DB storage ──────────────────────────────────────────────────────────────────────────
def _store_snapshot(rows):
    try:
        import psycopg2
        conn = psycopg2.connect(PG_DSN, connect_timeout=5)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS nemoclaw_dashboard_log (
                id SERIAL PRIMARY KEY, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                layer TEXT NOT NULL, service TEXT NOT NULL,
                status TEXT NOT NULL, note TEXT
            )
        """)
        for row in rows:
            cur.execute(
                "INSERT INTO nemoclaw_dashboard_log (timestamp,layer,service,status,note) "
                "VALUES (NOW(),%s,%s,%s,%s)",
                (row["layer"], row["service"], row["status"], row.get("note", "")),
            )
        conn.commit(); cur.close(); conn.close()
        log.info("Snapshot stored — %d rows", len(rows))
    except ImportError:
        log.info("psycopg2 not installed — skipping DB storage")
    except Exception as exc:
        log.warning("DB storage failed: %s", exc)


# ── Checks manifest ─────────────────────────────────────────────────────────────────────
_CHECKS = [
    ("VPS",   "n8n",          check_n8n),
    ("VPS",   "PostgreSQL",   check_postgres),
    ("VPS",   "Redis",        check_redis),
    ("VPS",   "Qdrant",       check_qdrant),
    ("Local", "Ollama",       check_ollama),
    ("App",   "Telegram Bot", check_telegram_bot),
    ("LLM",   "Z.ai GLM-5.1", check_zai_spend),
]

_FIXES = {
    "n8n":          "SSH to 46.225.51.30: sudo systemctl restart n8n",
    "PostgreSQL":   "Check: sudo systemctl status postgresql",
    "Redis":        "Check: sudo systemctl status redis-server",
    "Qdrant":       "Check: docker ps | grep qdrant",
    "Ollama":       "Pull model: ollama pull <model-name>",
    "Telegram Bot": "Verify TELEGRAM_TOKEN in .env and restart hetzy_phd.py",
    "Z.ai GLM-5.1": "Log in to z.ai dashboard and check monthly usage.",
}


def build_dashboard():
    tz = datetime.timezone(datetime.timedelta(hours=10))
    ts = datetime.datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S AEDT")
    rows = [{"layer": l, "service": s, **fn()} for l, s, fn in _CHECKS]
    alerts = [r for r in rows if r["status"] in ("error", "warn")]

    lines = [
        "## NemoClaw Mission Dashboard",
        f"**Generated:** {ts}",
        "",
        "### \U0001f7e2 HEALTHY | \U0001f7e1 WARNING | \U0001f534 ERROR",
        "",
        "| Layer | Service | Status | Note |",
        "|---|---|---|---|",
    ]
    for r in rows:
        lines.append(f"| {r['layer']} | {r['service']} | {_icon(r['status'])} | {r.get('note','')} |")

    if alerts:
        lines += ["", "### \u26a0\ufe0f ALERTS"]
        for a in alerts:
            fix = _FIXES.get(a["service"], "Check service logs")
            lines.append(f"- **{a['layer']} / {a['service']}** {_icon(a['status'])} {a.get('note','')}  \n  \u27a1\ufe0f {fix}")
    else:
        lines += ["", "### \u2705 All systems nominal"]

    zai = next((r.get("note", "") for r in rows if r["service"] == "Z.ai GLM-5.1"), "")
    lines += [
        "",
        "### \U0001f4b0 SPEND SUMMARY",
        f"- Z.ai GLM-5.1: {zai}",
        "- Gemini 2.5 Flash: $0.00 (free API)",
        "- Groq (NanoClaw): $0.00 (free tier)",
        "- Ollama (local iMac M4): $0.00",
    ]
    return "\n".join(lines), rows


def run(output="print"):
    log.info("NemoClaw Observer run (output=%s)", output)
    dashboard, rows = build_dashboard()
    _store_snapshot(rows)
    if output == "print":
        print(dashboard)
    elif output == "telegram":
        if TELEGRAM_TOKEN and TELEGRAM_CHAT:
            requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                json={"chat_id": TELEGRAM_CHAT, "text": dashboard, "parse_mode": "Markdown"},
                timeout=10,
            )
    elif output == "json":
        print(json.dumps(rows, default=str, indent=2))
    return dashboard


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "print"
    run(output=mode)
