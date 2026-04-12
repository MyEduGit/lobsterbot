'use strict';

const https = require('https');
const { COUNCIL } = require('./council');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${TOKEN}`;

function apiCall(method, params = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const req = https.request(
      `${API_BASE}/${method}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function send(chatId, text) {
  return apiCall('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

function formatList() {
  const rows = COUNCIL.map(m =>
    `${m.icon} *${m.num}. ${m.name}*\n` +
    `   _${m.role}_`
  );
  return (
    `\u2696\uFE0F *COUNCIL OF SEVEN*\n` +
    `_Seven Master Spirits \u2014 Governing the Constellation_\n\n` +
    rows.join('\n\n') +
    `\n\nUse /council\\_<id> for details\n` +
    `IDs: ${COUNCIL.map(m => `\`${m.id}\``).join(', ')}\n\n` +
    `_Governed by UrantiOS v1.0_`
  );
}

const QUOTES = {
  'Universal Father':      'All authority flows from the source.',
  'Eternal Son':           'The Word made manifest in action.',
  'Infinite Spirit':       'The Spirit governs where the eye cannot see.',
  'Father + Son':          'Where authority meets word, execution begins.',
  'Father + Spirit':       'Where authority meets spirit, automation is born.',
  'Son + Spirit':          'Where word meets spirit, intelligence emerges.',
  'Father + Son + Spirit': 'All knowledge is the synthesis of the Three.',
};

function formatMember(m) {
  return (
    `${m.icon} *${m.name}* \u2014 Seat ${m.num} of VII\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `*Spirit:* ${m.spirit}\n` +
    `*Role:* ${m.role}\n` +
    `*Association:* ${m.association}\n` +
    `*Node:* ${m.node}\n\n` +
    `*Mandate:*\n_${m.mandate}_\n\n` +
    `"${QUOTES[m.association] || 'Governed by Truth, Beauty, and Goodness.'}"`
  );
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text === '/start' || text === '/help') {
    await send(chatId,
      `\uD83E\uDD9E *LobsterBot* \u2014 Council of Seven Gateway\n\n` +
      `Commands:\n` +
      `/council \u2014 List all 7 council members\n` +
      `/council\\_<id> \u2014 Member details\n\n` +
      `Example: /council\\_gabriel\n\n` +
      `_Governed by UrantiOS v1.0_`
    );
    return;
  }

  if (text === '/council') {
    await send(chatId, formatList());
    return;
  }

  const match = text.match(/^\/council_([\w]+)/i);
  if (match) {
    const query = match[1].toLowerCase();
    const member = COUNCIL.find(
      m => m.id === query ||
           m.name.toLowerCase().replace(/\s+/g, '') === query
    );
    if (member) {
      await send(chatId, formatMember(member));
    } else {
      await send(chatId,
        `Unknown council member: *${match[1]}*\n\n` +
        `Valid IDs: ${COUNCIL.map(m => `\`${m.id}\``).join(', ')}`
      );
    }
    return;
  }
}

let offset = 0;

async function poll() {
  console.log('\uD83E\uDD9E LobsterBot \u2014 Council of Seven active');
  while (true) {
    try {
      const res = await apiCall('getUpdates', {
        offset,
        timeout: 30,
        allowed_updates: ['message'],
      });
      if (res.ok && res.result && res.result.length > 0) {
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
