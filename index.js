// lobsterbot — OpenClaw Telegram bridge
//
// Read-only Telegram control surface for a single Hetzner box (OpenClaw).
// Authenticates against a whitelist of Telegram user IDs and exposes a small
// set of safe, shelled-out system commands (status, disk, memory, uptime,
// docker ps, journalctl tail, ping). No free-form shell execution.
//
// UrantiOS governed — Truth, Beauty, Goodness.

'use strict';

require('dotenv').config();

const os = require('os');
const { execFile } = require('child_process');
const { Telegraf } = require('telegraf');

// ── Config ───────────────────────────────────────────────────────────────────

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('[lobsterbot] TELEGRAM_BOT_TOKEN is not set. Exiting.');
  process.exit(1);
}

const ALLOWED_IDS = new Set(
  (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
);

if (ALLOWED_IDS.size === 0) {
  console.error(
    '[lobsterbot] TELEGRAM_ALLOWED_USER_IDS is empty. Refusing to start an open bot. Exiting.'
  );
  process.exit(1);
}

const HOST_LABEL = process.env.LOBSTERBOT_HOST_LABEL || os.hostname();
const INSTANCE = process.env.LOBSTERBOT_INSTANCE || 'openclaw';
const MAX_OUTPUT = Number(process.env.LOBSTERBOT_MAX_OUTPUT || 3800);

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(...args) {
  console.log(`[lobsterbot:${INSTANCE}]`, ...args);
}

function runCommand(cmd, args = [], { timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err && err.code === 'ENOENT') {
          resolve({ ok: false, output: `command not found: ${cmd}` });
          return;
        }
        if (err && err.killed) {
          resolve({ ok: false, output: `command timed out after ${timeoutMs}ms` });
          return;
        }
        const out = (stdout || '').trim();
        const errOut = (stderr || '').trim();
        // Treat non-zero exit as a soft failure — include both streams.
        if (err) {
          resolve({
            ok: false,
            output: [out, errOut].filter(Boolean).join('\n') || `exit ${err.code}`,
          });
          return;
        }
        resolve({ ok: true, output: out || errOut || '(no output)' });
      }
    );
  });
}

function truncate(text) {
  if (text.length <= MAX_OUTPUT) return text;
  const head = text.slice(0, MAX_OUTPUT);
  return `${head}\n...[truncated ${text.length - MAX_OUTPUT} chars]`;
}

function codeBlock(text) {
  return '```\n' + truncate(text) + '\n```';
}

async function reply(ctx, text, { mono = false } = {}) {
  const body = mono ? codeBlock(text) : truncate(text);
  await ctx.reply(body, {
    parse_mode: mono ? 'Markdown' : undefined,
    disable_web_page_preview: true,
  });
}

// ── Auth middleware ──────────────────────────────────────────────────────────

const bot = new Telegraf(TOKEN);

bot.use(async (ctx, next) => {
  const uid = ctx.from && ctx.from.id;
  if (!uid || !ALLOWED_IDS.has(uid)) {
    log('denied', { uid, username: ctx.from && ctx.from.username });
    // Stay quiet with strangers — a single terse reply, nothing more.
    if (ctx.chat) {
      try {
        await ctx.reply('Not authorized.');
      } catch (_) {
        /* ignore */
      }
    }
    return;
  }
  return next();
});

// ── Commands ────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  await reply(
    ctx,
    [
      `🦞 lobsterbot — ${HOST_LABEL}`,
      '',
      'Read-only system visibility over Telegram.',
      '',
      'Type /help for the command list.',
    ].join('\n')
  );
});

bot.help(async (ctx) => {
  await reply(
    ctx,
    [
      `🦞 lobsterbot — ${HOST_LABEL} (${INSTANCE})`,
      '',
      '/status   — host, uptime, load, memory, disk summary',
      '/uptime   — uptime and load averages',
      '/mem      — memory usage (free -h)',
      '/disk     — disk usage (df -hT)',
      '/docker   — docker ps (running containers)',
      '/svc      — top systemd services by memory',
      '/ports    — listening tcp ports (ss -tlnp)',
      '/ping URL — HTTP HEAD probe (whitelist of schemes http/https)',
      '/logs N   — last N lines from journalctl (N defaults to 30, max 200)',
      '/who      — whoami + id',
      '/help     — this message',
    ].join('\n')
  );
});

bot.command('status', async (ctx) => {
  const [uptime, load, mem, disk] = await Promise.all([
    runCommand('uptime', ['-p']),
    runCommand('uptime'),
    runCommand('free', ['-h']),
    runCommand('df', ['-hT', '-x', 'tmpfs', '-x', 'devtmpfs']),
  ]);
  const body = [
    `host: ${HOST_LABEL} (${os.hostname()})`,
    `kernel: ${os.release()}`,
    `uptime: ${uptime.output}`,
    '',
    '── load ──',
    load.output,
    '',
    '── memory ──',
    mem.output,
    '',
    '── disk ──',
    disk.output,
  ].join('\n');
  await reply(ctx, body, { mono: true });
});

bot.command('uptime', async (ctx) => {
  const r = await runCommand('uptime');
  await reply(ctx, r.output, { mono: true });
});

bot.command('mem', async (ctx) => {
  const r = await runCommand('free', ['-h']);
  await reply(ctx, r.output, { mono: true });
});

bot.command('disk', async (ctx) => {
  const r = await runCommand('df', ['-hT', '-x', 'tmpfs', '-x', 'devtmpfs']);
  await reply(ctx, r.output, { mono: true });
});

bot.command('docker', async (ctx) => {
  const r = await runCommand('docker', [
    'ps',
    '--format',
    'table {{.Names}}\t{{.Status}}\t{{.Image}}',
  ]);
  await reply(ctx, r.output || '(no containers)', { mono: true });
});

bot.command('svc', async (ctx) => {
  const r = await runCommand('systemd-cgtop', ['-n', '1', '-b', '--depth=2']);
  await reply(ctx, r.output, { mono: true });
});

bot.command('ports', async (ctx) => {
  const r = await runCommand('ss', ['-tlnp']);
  await reply(ctx, r.output, { mono: true });
});

bot.command('who', async (ctx) => {
  const [whoami, id] = await Promise.all([
    runCommand('whoami'),
    runCommand('id'),
  ]);
  await reply(ctx, `${whoami.output}\n${id.output}`, { mono: true });
});

bot.command('logs', async (ctx) => {
  const parts = (ctx.message.text || '').trim().split(/\s+/).slice(1);
  let n = Number(parts[0]);
  if (!Number.isFinite(n) || n <= 0) n = 30;
  if (n > 200) n = 200;
  const r = await runCommand('journalctl', ['-n', String(n), '--no-pager']);
  await reply(ctx, r.output, { mono: true });
});

bot.command('ping', async (ctx) => {
  const parts = (ctx.message.text || '').trim().split(/\s+/).slice(1);
  const target = parts[0];
  if (!target) {
    await reply(ctx, 'usage: /ping <http(s) url>');
    return;
  }
  let url;
  try {
    url = new URL(target);
  } catch (_) {
    await reply(ctx, 'invalid URL');
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    await reply(ctx, 'only http/https URLs are allowed');
    return;
  }
  const started = Date.now();
  try {
    // Node 18+ has global fetch.
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 6000);
    const res = await fetch(url, { method: 'HEAD', signal: ac.signal });
    clearTimeout(t);
    const ms = Date.now() - started;
    await reply(ctx, `${res.status} ${res.statusText}  (${ms} ms)\n${url}`, {
      mono: true,
    });
  } catch (err) {
    const ms = Date.now() - started;
    await reply(ctx, `request failed after ${ms} ms: ${err.message}`, {
      mono: true,
    });
  }
});

// Unknown commands — be polite, don't echo arbitrary text.
bot.on('message', async (ctx) => {
  const text = ctx.message && ctx.message.text;
  if (text && text.startsWith('/')) {
    await reply(ctx, 'unknown command — /help for the list');
  }
});

// ── Startup ─────────────────────────────────────────────────────────────────

bot
  .launch()
  .then(() => log(`online — host=${HOST_LABEL} allowed=${[...ALLOWED_IDS].join(',')}`))
  .catch((err) => {
    console.error('[lobsterbot] launch failed:', err);
    process.exit(1);
  });

// Clean shutdown so systemd restarts are quiet.
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
