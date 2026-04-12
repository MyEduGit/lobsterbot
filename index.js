'use strict';

// LobsterBot — Council of Seven Gateway
// Governed by UrantiOS v1.0 | Truth · Beauty · Goodness

const https = require('https');
const { COUNCIL, SPIRIT_QUOTES } = require('./council');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN not set. Copy .env.example to .env and fill in your token.');
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${TOKEN}`;

function apiCall(method, params = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const req = https.request(
      `${API_BASE}/${method}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(JSON.parse(data)));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sendMessage(chatId, text, extra = {}) {
  return apiCall('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', ...extra });
}

// ---- Formatters ----

function fmtCouncilList() {
  const header = `\u2696\uFE0F *COUNCIL OF SEVEN*\n_Seven Master Spirits \u2014 Governing the Constellation_\n\n`;
  const rows = COUNCIL.map(m =>
    `${m.icon} *${m.num}. ${m.name}*\n` +
    `   ${m.role}\n` +
    `   _${m.spirit}_`
  ).join('\n\n');
  const footer = `\n\n_Governed by UrantiOS v1.0_\n` +
    `Details: /council\_imac \u00b7 /council\_gabriel \u00b7 /council\_urantios\n` +
    `/council\_openclaw \u00b7 /council\_nanoclaw \u00b7 /council\_hetzy \u00b7 /council\_urantipedia`;
  return header + rows + footer;
}

function fmtMember(m) {
  const quote = SPIRIT_QUOTES[m.association] || '';
  return (
    `${m.icon} *${m.name}*\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `*Seat:* Master Spirit ${m.num} of VII\n` +
    `*Spirit:* ${m.spirit}\n` +
    `*Role:* ${m.role}\n` +
    `*Association:* ${m.association}\n` +
    `*Node:* ${m.node}\n\n` +
    `*Mandate:* ${m.mandate}\n\n` +
    `_\u201c${quote}\u201d_`
  );
}

// ---- Command handlers ----

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const text = msg.text.trim();
  const chatId = msg.chat.id;

  if (text === '/start' || text.startsWith('/start ')) {
    await sendMessage(chatId,
      `\uD83E\uDD80 *LobsterBot* \u2014 Council of Seven Gateway\n` +
      `_Governed by UrantiOS v1.0_\n\n` +
      `*Commands:*\n` +
      `/council \u2014 List all 7 council members\n` +
      `/council\_<id> \u2014 Details on a specific member\n\n` +
      `*Council IDs:* imac \u00b7 gabriel \u00b7 urantios \u00b7 openclaw \u00b7 nanoclaw \u00b7 hetzy \u00b7 urantipedia\n\n` +
      `_Truth \u00b7 Beauty \u00b7 Goodness_`
    );
    return;
  }

  if (text === '/council' || text === '/council@LobsterBot') {
    await sendMessage(chatId, fmtCouncilList());
    return;
  }

  // /council_<id> or /council_<id>@BotName
  const memberMatch = text.match(/^\/council_(\w+)/);
  if (memberMatch) {
    const query = memberMatch[1].toLowerCase();
    const member = COUNCIL.find(m =>
      m.id === query ||
      m.name.toLowerCase().replace(/[^a-z0-9]/g, '') === query
    );
    if (member) {
      await sendMessage(chatId, fmtMember(member));
    } else {
      const ids = COUNCIL.map(m => `/council\_${m.id}`).join(' \u00b7 ');
      await sendMessage(chatId, `Unknown council member \u201c${query}\u201d.\n\nValid IDs: ${ids}`);
    }
    return;
  }
}

// ---- Long-polling loop ----

let offset = 0;

async function poll() {
  console.log('\uD83E\uDD80 LobsterBot starting \u2014 Council of Seven active');
  console.log('UrantiOS v1.0 | Truth \u00b7 Beauty \u00b7 Goodness');

  while (true) {
    try {
      const res = await apiCall('getUpdates', {
        offset,
        timeout: 30,
        allowed_updates: ['message'],
      });
      if (res.ok && res.result.length > 0) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          handleUpdate(update).catch(err =>
            console.error('Handler error:', err.message)
          );
        }
      }
    } catch (err) {
      console.error('Poll error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

poll();
