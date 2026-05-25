#!/usr/bin/env node
/**
 * notify-daily.js — Send a daily book publication notification via Telegram.
 *
 * Called by GitHub Actions after a daily book is published.
 * Reads result JSON from stdin or --result-file argument.
 *
 * Usage:
 *   echo '{"title":"...","theme":"..."}' | node scripts/notify-daily.js
 *   node scripts/notify-daily.js --result-file /tmp/daily-result.json
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN  — Bot token
 *   TELEGRAM_CHAT_ID    — Chat to notify
 */

'use strict';

const fs = require('node:fs');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(text) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram ${res.status}: ${body}`);
  }
  return res.json();
}

function formatMessage(result) {
  const b = result.book || result;
  const lines = [
    '📚 *Daily Book Published*',
    '',
    `*${escape(b.title || 'Untitled')}*`,
    `Theme: ${escape(b.theme || 'unknown')}`,
    `Chapters: ${b.chapters || '?'} · Words: ${(b.words || 0).toLocaleString()}`,
  ];
  if (result.remaining !== undefined) {
    lines.push(`Remaining themes: ${result.remaining}`);
  }
  lines.push('', '_Truth · Beauty · Goodness_');
  return lines.join('\n');
}

function escape(s) {
  return String(s).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

async function main() {
  if (!TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set.');
    process.exit(1);
  }

  let input;
  const fileArg = process.argv.indexOf('--result-file');
  if (fileArg >= 0 && process.argv[fileArg + 1]) {
    input = fs.readFileSync(process.argv[fileArg + 1], 'utf8');
  } else {
    input = fs.readFileSync(0, 'utf8');
  }

  const result = JSON.parse(input);
  if (result.status === 'exhausted') {
    console.log('All themes exhausted, no notification sent.');
    return;
  }

  const msg = formatMessage(result);
  await sendMessage(msg);
  console.log('Notification sent.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
