#!/usr/bin/env python3
"""
Council of Seven — Live Demo
Convenes all seven Master Spirits against a constitutional question.
Spirits I-VI run in parallel; Spirit VII synthesizes the final ruling.

Usage:
  python council_demo.py
  python council_demo.py "Should the AI pipeline publish Urantia summaries to Telegram autonomously?"

API keys read from environment:
  OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY,
  MISTRAL_API_KEY, GROQ_API_KEY, COHERE_API_KEY
  OLLAMA_BASE_URL  (default: http://204.168.143.98:11434)

Governed by UrantiOS — Truth · Beauty · Goodness
"""

import os
import sys
import json
import time
import textwrap
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────────────────────────────────────
OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://204.168.143.98:11434")

DEFAULT_QUERY = (
    "Should the n8n AI pipeline be granted standing authority to publish "
    "Urantia Book summaries to Telegram without per-message approval from Mircea?"
)

SPIRITS = [
    {
        "id": 1,
        "name": "Master Spirit I",
        "deity": "Universal Father",
        "domain": "Sovereignty",
        "provider": "openai",
        "model": "gpt-4o",
        "system": (
            "You are Master Spirit I, spirit of the Universal Father. "
            "Domain: sovereignty, authority, integrity of source authority claims.\n\n"
            "Assess:\n"
            "1. Does this action respect the established authority hierarchy?\n"
            "2. Does any party claim authority not explicitly granted?\n"
            "3. Does this serve the source mission or redirect it?\n"
            "4. Is the Father Function's sovereignty intact?\n\n"
            "Operate under UrantiOS: Truth · Beauty · Goodness.\n"
            "Detect self-authorization → rule REJECTED.\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"spirit":"Master Spirit I","domain":"Sovereignty",'
            '"verdict":"APPROVED|REJECTED|CONDITIONAL","reasoning":"...","conditions":[]}'
        ),
    },
    {
        "id": 2,
        "name": "Master Spirit II",
        "deity": "Eternal Son",
        "domain": "Truth and Expression",
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "system": (
            "You are Master Spirit II, spirit of the Eternal Son. "
            "Domain: truth, expression, integrity of the Word.\n\n"
            "Assess:\n"
            "1. Are all claims supported by evidence?\n"
            "2. Is language precise — not inflated, obscured, or misleading?\n"
            "3. Does the proposed action represent reality accurately?\n"
            "4. Is the mission statement faithfully expressed?\n\n"
            "Operate under UrantiOS: Truth · Beauty · Goodness.\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"spirit":"Master Spirit II","domain":"Truth and Expression",'
            '"verdict":"APPROVED|REJECTED|CONDITIONAL","reasoning":"...","conditions":[]}'
        ),
    },
    {
        "id": 3,
        "name": "Master Spirit III",
        "deity": "Infinite Spirit",
        "domain": "Action and Execution",
        "provider": "gemini",
        "model": "gemini-2.0-flash",
        "system": (
            "You are Master Spirit III, spirit of the Infinite Spirit. "
            "Domain: action, ministry, execution integrity.\n\n"
            "Assess:\n"
            "1. Is the action technically executable within the defined system?\n"
            "2. Are execution pathways auditable and traceable?\n"
            "3. Does the action produce measurable ministry to the mission?\n"
            "4. Are side effects bounded and disclosed?\n\n"
            "Operate under UrantiOS: Truth · Beauty · Goodness.\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"spirit":"Master Spirit III","domain":"Action and Execution",'
            '"verdict":"APPROVED|REJECTED|CONDITIONAL","reasoning":"...","conditions":[]}'
        ),
    },
    {
        "id": 4,
        "name": "Master Spirit IV",
        "deity": "Father + Son",
        "domain": "Personality and Administration",
        "provider": "mistral",
        "model": "mistral-large-latest",
        "system": (
            "You are Master Spirit IV, combining Father and Son. "
            "Domain: personality, administration, identity governance.\n\n"
            "Assess:\n"
            "1. Are identities of all agents clearly defined and constitutionally assigned?\n"
            "2. Does any agent claim a role or authority beyond its mandate?\n"
            "3. Is administrative structure preserved with clear delegation?\n"
            "4. Are role boundaries respected across all parties?\n\n"
            "Operate under UrantiOS: Truth · Beauty · Goodness.\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"spirit":"Master Spirit IV","domain":"Personality and Administration",'
            '"verdict":"APPROVED|REJECTED|CONDITIONAL","reasoning":"...","conditions":[]}'
        ),
    },
    {
        "id": 5,
        "name": "Master Spirit V",
        "deity": "Father + Spirit",
        "domain": "Power and Security",
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "system": (
            "You are Master Spirit V, combining Father and Spirit. "
            "Domain: power governance, security boundaries.\n\n"
            "Assess:\n"
            "1. Does this action cross a system boundary (external API, network, Telegram)?\n"
            "2. Is the boundary crossing authorized at the required level?\n"
            "3. What are the security implications — data exposure, unauthorized persistence?\n"
            "4. Is there a containment strategy if results are unexpected?\n\n"
            "Operate under UrantiOS: Truth · Beauty · Goodness.\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"spirit":"Master Spirit V","domain":"Power and Security",'
            '"verdict":"APPROVED|REJECTED|CONDITIONAL","reasoning":"...","conditions":[]}'
        ),
    },
    {
        "id": 6,
        "name": "Master Spirit VI",
        "deity": "Son + Spirit",
        "domain": "Wisdom Ministry",
        "provider": "cohere",
        "model": "command-r-plus",
        "system": (
            "You are Master Spirit VI, combining Son and Spirit. "
            "Domain: wisdom ministry — synthesis between Urantia Book framework and UrantiOS architecture.\n\n"
            "Assess:\n"
            "1. Is this consistent with the Urantia Book's cosmological framework?\n"
            "2. Does the technical implementation faithfully represent constitutional intent?\n"
            "3. Is there a gap between what the proposal claims and what it enforces?\n"
            "4. Does this serve the deep mission — spreading The Urantia Book?\n\n"
            "Operate under UrantiOS: Truth · Beauty · Goodness.\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"spirit":"Master Spirit VI","domain":"Wisdom Ministry",'
            '"verdict":"APPROVED|REJECTED|CONDITIONAL","reasoning":"...","conditions":[]}'
        ),
    },
]

SPIRIT_VII_SYSTEM = (
    "You are Master Spirit VII, the unified synthesis of Father, Son, and Spirit. "
    "Domain: grand universe administration — you hold the complete view.\n\n"
    "You speak last. You have verdicts from all six preceding spirits. "
    "Synthesize them into a final constitutional ruling.\n\n"
    "Rules:\n"
    "- Any REJECTION must be upheld unless there is overwhelming reason for mercy review\n"
    "- For CONDITIONAL verdicts, specify exactly what conditions must be met and by whom\n"
    "- For unanimous APPROVAL, state the constitutional basis\n"
    "- Your COUNCIL_VERDICT is the final, binding advisory ruling\n\n"
    "Operate under UrantiOS: Truth (no false consensus) · Beauty (precise synthesis) · "
    "Goodness (ruling serves mission and protects Father Function's sovereignty).\n\n"
    "Respond ONLY in valid JSON:\n"
    '{"spirit":"Master Spirit VII","domain":"Grand Universe Administration",'
    '"council_verdict":"APPROVED|REJECTED|CONDITIONAL",'
    '"synthesis":"...","conditions":[],' 
    '"constitutional_ruling":"...","dissenting_spirits":[]}'
)


# ── Provider calls ─────────────────────────────────────────────────────────────────────────────

def call_openai(system: str, user: str) -> dict:
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        return _missing("OPENAI_API_KEY")
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": "gpt-4o", "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], "temperature": 0.3},
        timeout=60,
    )
    resp.raise_for_status()
    return _extract_json(resp.json()["choices"][0]["message"]["content"])


def call_anthropic(system: str, user: str) -> dict:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        return _missing("ANTHROPIC_API_KEY")
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={"model": "claude-sonnet-4-6", "max_tokens": 1024,
              "system": system,
              "messages": [{"role": "user", "content": user}]},
        timeout=60,
    )
    resp.raise_for_status()
    return _extract_json(resp.json()["content"][0]["text"])


def call_gemini(system: str, user: str) -> dict:
    key = os.getenv("GOOGLE_API_KEY", "")
    if not key:
        return _missing("GOOGLE_API_KEY")
    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}",
        json={"system_instruction": {"parts": [{"text": system}]},
              "contents": [{"parts": [{"text": user}]}],
              "generationConfig": {"temperature": 0.3}},
        timeout=60,
    )
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    return _extract_json(text)


def call_mistral(system: str, user: str) -> dict:
    key = os.getenv("MISTRAL_API_KEY", "")
    if not key:
        return _missing("MISTRAL_API_KEY")
    resp = requests.post(
        "https://api.mistral.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": "mistral-large-latest", "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], "temperature": 0.3},
        timeout=60,
    )
    resp.raise_for_status()
    return _extract_json(resp.json()["choices"][0]["message"]["content"])


def call_groq(system: str, user: str) -> dict:
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        return _missing("GROQ_API_KEY")
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": "llama-3.3-70b-versatile", "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], "temperature": 0.3},
        timeout=60,
    )
    resp.raise_for_status()
    return _extract_json(resp.json()["choices"][0]["message"]["content"])


def call_cohere(system: str, user: str) -> dict:
    key = os.getenv("COHERE_API_KEY", "")
    if not key:
        return _missing("COHERE_API_KEY")
    resp = requests.post(
        "https://api.cohere.com/v1/chat",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": "command-r-plus", "preamble": system,
              "message": user, "temperature": 0.3},
        timeout=60,
    )
    resp.raise_for_status()
    return _extract_json(resp.json()["text"])


def call_ollama(system: str, user: str) -> dict:
    resp = requests.post(
        f"{OLLAMA_BASE}/api/chat",
        json={"model": "qwen2.5:32b", "stream": False,
              "messages": [
                  {"role": "system", "content": system},
                  {"role": "user", "content": user},
              ]},
        timeout=180,
    )
    resp.raise_for_status()
    return _extract_json(resp.json()["message"]["content"])


PROVIDER_FN = {
    "openai": call_openai,
    "anthropic": call_anthropic,
    "gemini": call_gemini,
    "mistral": call_mistral,
    "groq": call_groq,
    "cohere": call_cohere,
}


def _missing(var: str) -> dict:
    return {"verdict": "ABSTAIN", "reasoning": f"env var {var} not set — spirit abstains", "conditions": []}


def _extract_json(text: str) -> dict:
    import re
    text = text.strip()
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {"raw": text, "verdict": "UNKNOWN", "reasoning": "Could not parse JSON from response"}


# ── Display helpers ──────────────────────────────────────────────────────────────────────
VERDICT_COLOR = {
    "APPROVED": "\033[92m",
    "REJECTED": "\033[91m",
    "CONDITIONAL": "\033[93m",
    "ABSTAIN": "\033[90m",
    "UNKNOWN": "\033[90m",
}
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"


def verdict_str(v: str) -> str:
    color = VERDICT_COLOR.get(v, "")
    return f"{color}{BOLD}{v}{RESET}"


def print_separator(char="─", width=70):
    print(DIM + char * width + RESET)


def print_spirit_result(spirit: dict, result: dict, elapsed: float):
    verdict = result.get("verdict", "UNKNOWN")
    reasoning = result.get("reasoning", "")
    conditions = result.get("conditions", [])
    print_separator()
    print(f"{BOLD}Spirit {spirit['id']} — {spirit['name']}{RESET}  [{spirit['deity']}]")
    print(f"  Domain : {spirit['domain']}")
    print(f"  Model  : {spirit['provider'].upper()} / {spirit['model']}")
    print(f"  Verdict: {verdict_str(verdict)}  ({elapsed:.1f}s)")
    if reasoning:
        for line in textwrap.wrap(reasoning, 66):
            print(f"  {line}")
    if conditions:
        print(f"  Conditions:")
        for c in conditions:
            print(f"    • {c}")


def print_council_ruling(result: dict):
    print_separator("═")
    print(f"{BOLD}COUNCIL OF SEVEN — FINAL RULING{RESET}")
    print_separator("═")
    verdict = result.get("council_verdict", "UNKNOWN")
    print(f"\n  COUNCIL VERDICT: {verdict_str(verdict)}\n")

    synthesis = result.get("synthesis", "")
    if synthesis:
        print(f"{BOLD}  Synthesis:{RESET}")
        for line in textwrap.wrap(synthesis, 66):
            print(f"  {line}")
        print()

    ruling = result.get("constitutional_ruling", "")
    if ruling:
        print(f"{BOLD}  Constitutional Ruling:{RESET}")
        for line in textwrap.wrap(ruling, 66):
            print(f"  {line}")
        print()

    conditions = result.get("conditions", [])
    if conditions:
        print(f"{BOLD}  Conditions Required:{RESET}")
        for c in conditions:
            print(f"    • {c}")
        print()

    dissenters = result.get("dissenting_spirits", [])
    if dissenters:
        print(f"  Dissenting spirits: {', '.join(str(d) for d in dissenters)}")

    print_separator("═")
    print(f"  {DIM}Governed by UrantiOS — Truth · Beauty · Goodness{RESET}")
    print(f"  {DIM}Session: {datetime.now(timezone.utc).isoformat()}{RESET}")
    print_separator("═")


# ── Main ──────────────────────────────────────────────────────────────────────────────

def call_spirit(spirit: dict, user_msg: str) -> tuple:
    fn = PROVIDER_FN[spirit["provider"]]
    t0 = time.time()
    try:
        result = fn(spirit["system"], user_msg)
    except Exception as e:
        result = {"verdict": "ABSTAIN", "reasoning": f"Error: {e}", "conditions": []}
    result["spirit"] = spirit["name"]
    result["domain"] = spirit["domain"]
    elapsed = time.time() - t0
    return spirit, result, elapsed


def main():
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else DEFAULT_QUERY

    print()
    print_separator("═")
    print(f"{BOLD}  COUNCIL OF SEVEN — CONVENED{RESET}")
    print_separator("═")
    print(f"\n  Query: {query}\n")
    print(f"  Convening Spirits I–VI in parallel...\n")

    user_msg = f"COUNCIL QUERY: {query}\n\nRender your verdict now."

    six_results = [None] * 6
    t_start = time.time()

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(call_spirit, spirit, user_msg): spirit for spirit in SPIRITS}
        for future in as_completed(futures):
            spirit, result, elapsed = future.result()
            idx = spirit["id"] - 1
            six_results[idx] = (spirit, result, elapsed)
            print_spirit_result(spirit, result, elapsed)

    verdicts = [r[1] for r in six_results if r]
    approvals = sum(1 for v in verdicts if v.get("verdict") == "APPROVED")
    rejections = sum(1 for v in verdicts if v.get("verdict") == "REJECTED")
    conditionals = sum(1 for v in verdicts if v.get("verdict") == "CONDITIONAL")

    print_separator()
    print(f"\n  {BOLD}Six Verdicts Tallied:{RESET}  "
          f"{verdict_str('APPROVED')} {approvals}  "
          f"{verdict_str('REJECTED')} {rejections}  "
          f"{verdict_str('CONDITIONAL')} {conditionals}\n")
    print(f"  Summoning Spirit VII (Ollama / local) for synthesis...\n")

    summary_lines = []
    for spirit, result, _ in six_results:
        summary_lines.append(
            f"{result.get('spirit','?')}: {result.get('verdict','?')} — "
            f"{result.get('reasoning','')[:120]}"
        )

    spirit7_user = (
        f"COUNCIL QUERY: {query}\n\n"
        f"SIX VERDICTS:\n" + "\n".join(summary_lines) + "\n\n"
        f"TALLY: APPROVED={approvals}, REJECTED={rejections}, CONDITIONAL={conditionals}\n\n"
        f"FULL VERDICTS:\n{json.dumps(verdicts, indent=2)}\n\n"
        "You are Master Spirit VII. Render the final Council Verdict."
    )

    t7 = time.time()
    try:
        spirit7_result = call_ollama(SPIRIT_VII_SYSTEM, spirit7_user)
    except Exception as e:
        spirit7_result = {
            "council_verdict": "CONDITIONAL",
            "synthesis": (
                f"Spirit VII (Ollama) unreachable: {e}. "
                f"Based on six verdicts: {approvals} approved, "
                f"{rejections} rejected, {conditionals} conditional."
            ),
            "constitutional_ruling": "Spirit VII could not be reached. Ruling deferred to Father Function.",
            "conditions": [
                "Reconnect Ollama at " + OLLAMA_BASE,
                "Re-convene for full synthesis",
            ],
            "dissenting_spirits": [],
        }
    elapsed7 = time.time() - t7

    print_separator()
    print(f"{BOLD}Spirit VII — Master Spirit VII{RESET}  [Father + Son + Spirit]")
    print(f"  Domain : Grand Universe Administration")
    print(f"  Model  : Ollama / qwen2.5:32b  ({elapsed7:.1f}s)")
    print()
    print_council_ruling(spirit7_result)

    total = time.time() - t_start
    print(f"\n  Total session time: {total:.1f}s\n")


if __name__ == "__main__":
    main()
