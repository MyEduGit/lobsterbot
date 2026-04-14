#!/usr/bin/env node
/**
 * LobsterBot — Telegram frontend for URANTiOS.
 *
 * Governed by UrantiOS: Truth · Beauty · Goodness.
 *
 * Commands:
 *   /start                         — greet and show help
 *   /help                          — show help
 *   /writebook <theme>             — kick off a book generation via
 *                                    URANTiOS bookwriter (async)
 *   /status                        — report last book-generation result
 *
 * Uses the Telegram Bot HTTP API directly (no extra dependencies) — long
 * polling via getUpdates. Set env vars:
 *
 *   TELEGRAM_BOT_TOKEN           — token from @BotFather  (required to run)
 *   LOBSTER_ALLOWED_USER_IDS     — comma-separated Telegram numeric IDs
 *                                  authorised to call /writebook
 *   URANTIOS_REPO                — path to URANTiOS repo (default: ../URANTiOS)
 *   BOOKWRITER_VAULTS            — colon-separated vault roots
 *   BOOKWRITER_DRY_RUN           — "1" to use the offline stub
 *
 * This file is intentionally single-file and dependency-free so the bot
 * runs anywhere Node 18+ is installed.
 */

'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// ─── Config ──────────────────────────────────────────────────────────────
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ALLOWED = (process.env.LOBSTER_ALLOWED_USER_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const URANTIOS_REPO =
  process.env.URANTIOS_REPO ||
  path.resolve(__dirname, '..', 'URANTiOS');
const VAULTS = (process.env.BOOKWRITER_VAULTS || '')
  .split(':')
  .map((s) => s.trim())
  .filter(Boolean);
const DRY_RUN = process.env.BOOKWRITER_DRY_RUN === '1';
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;

// In-memory state
const jobs = new Map(); // chatId -> {theme, startedAt, pid, status, lastLine}

// ─── Telegram helpers ────────────────────────────────────────────────────
async function tg(method, payload) {
  if (!API) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram ${method} ${res.status}: ${text}`);
  }
  return res.json();
}

function sendMessage(chatId, text, extra = {}) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    ...extra,
  }).catch((e) => console.error('[sendMessage]', e.message));
}

// ─── Authorisation (UrantiOS: sovereignty is earned, not declared) ──────
function authorised(userId) {
  if (ALLOWED.length === 0) return true; // open mode if no allow-list
  return ALLOWED.includes(String(userId));
}

// ─── BookWriter launcher ────────────────────────────────────────────────
function launchBookWriter(chatId, theme) {
  const args = ['-m', 'bookwriter', 'write', '--theme', theme];
  if (DRY_RUN) args.push('--dry-run');
  for (const v of VAULTS) args.push('--vault', v);

  const existing = jobs.get(chatId);
  if (existing && existing.status === 'running') {
    sendMessage(
      chatId,
      `⚠️ A book is already being written for this chat:\n\`${existing.theme}\`\nWait for it to finish or send /status.`,
    );
    return;
  }

  if (!fs.existsSync(URANTIOS_REPO)) {
    sendMessage(
      chatId,
      `❌ URANTiOS repo not found at \`${URANTIOS_REPO}\`. Set \`URANTIOS_REPO\` env var.`,
    );
    return;
  }

  sendMessage(
    chatId,
    `📚 Starting book generation…\n*Theme:* ${escapeMd(theme)}\n_(Truth · Beauty · Goodness)_`,
  );

  const child = spawn('python3', args, {
    cwd: URANTIOS_REPO,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });

  const job = {
    theme,
    startedAt: new Date().toISOString(),
    pid: child.pid,
    status: 'running',
    lastLine: '',
    stdout: '',
    stderr: '',
  };
  jobs.set(chatId, job);

  child.stdout.on('data', (buf) => {
    const text = buf.toString();
    job.stdout += text;
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length) job.lastLine = lines[lines.length - 1];
  });
  child.stderr.on('data', (buf) => {
    job.stderr += buf.toString();
  });
  child.on('exit', (code) => {
    job.status = code === 0 ? 'done' : 'failed';
    job.exitCode = code;
    const head = job.stdout.trim().slice(-800) || '(no output)';
    const tag = code === 0 ? '✅' : '❌';
    sendMessage(
      chatId,
      `${tag} *BookWriter* (${job.theme})\nExit: ${code}\n\n\`\`\`\n${head}\n\`\`\``,
    );
  });
  child.on('error', (err) => {
    job.status = 'failed';
    job.error = err.message;
    sendMessage(chatId, `❌ Failed to spawn bookwriter: \`${err.message}\``);
  });
}

// ─── Commands ────────────────────────────────────────────────────────────
function handleStart(msg) {
  sendMessage(
    msg.chat.id,
    [
      '🦞 *LobsterBot* — URANTiOS frontend',
      '',
      'Commands:',
      '• `/writebook <theme>` — generate a book grounded in The Urantia Book',
      '• `/status` — progress of the current / last book',
      '• `/help` — this message',
      '',
      '_Truth · Beauty · Goodness_',
    ].join('\n'),
  );
}

function handleWriteBook(msg, args) {
  if (!authorised(msg.from.id)) {
    return sendMessage(
      msg.chat.id,
      '⛔ Not on the authorised user list. Ask the operator to add your Telegram user ID.',
    );
  }
  const theme = args.trim();
  if (!theme) {
    return sendMessage(
      msg.chat.id,
      'Usage: `/writebook <theme>`\nExample: `/writebook The Bestowal Career of Michael of Nebadon`',
    );
  }
  launchBookWriter(msg.chat.id, theme);
}

function handleStatus(msg) {
  const job = jobs.get(msg.chat.id);
  if (!job) return sendMessage(msg.chat.id, 'No book-generation job for this chat yet.');
  const age = Math.round((Date.now() - Date.parse(job.startedAt)) / 1000);
  const lines = [
    `*Status:* ${job.status}`,
    `*Theme:* ${escapeMd(job.theme)}`,
    `*Started:* ${job.startedAt} (${age}s ago)`,
    `*Last line:* \`${escapeMd((job.lastLine || '').slice(0, 120))}\``,
  ];
  if (job.exitCode !== undefined) lines.push(`*Exit:* ${job.exitCode}`);
  sendMessage(msg.chat.id, lines.join('\n'));
}

// ─── Dispatcher ──────────────────────────────────────────────────────────
function dispatch(msg) {
  if (!msg || !msg.text) return;
  const text = msg.text.trim();
  if (!text.startsWith('/')) return;
  const [raw, ...rest] = text.split(/\s+/);
  const cmd = raw.split('@')[0].toLowerCase();
  const args = rest.join(' ');
  switch (cmd) {
    case '/start':
    case '/help':
      return handleStart(msg);
    case '/writebook':
      return handleWriteBook(msg, args);
    case '/status':
      return handleStatus(msg);
    default:
      return sendMessage(msg.chat.id, `Unknown command: \`${cmd}\` — try /help`);
  }
}

// ─── Long-polling loop ───────────────────────────────────────────────────
async function pollUpdates() {
  let offset = 0;
  console.log('[lobsterbot] polling for updates…');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await tg('getUpdates', { offset, timeout: 25 });
      for (const upd of res.result || []) {
        offset = upd.update_id + 1;
        try {
          dispatch(upd.message || upd.edited_message);
        } catch (e) {
          console.error('[dispatch]', e);
        }
      }
    } catch (e) {
      console.error('[poll]', e.message);
      await sleep(5_000);
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeMd(s) {
  return String(s).replace(/([`*_\[\]()~>#+\-=|{}.!])/g, '\\$1');
}

// ─── Entry point ─────────────────────────────────────────────────────────
function main() {
  if (!TOKEN) {
    console.error(
      'TELEGRAM_BOT_TOKEN not set. Copy .env.example to .env and fill it in.',
    );
    process.exit(1);
  }
  pollUpdates().catch((e) => {
    console.error('[fatal]', e);
    process.exit(1);
  });
}

if (require.main === module) main();

module.exports = { launchBookWriter, dispatch, authorised };
