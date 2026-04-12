require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const openclaw = require('./openclaw');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Hi! I am lobsterbot, powered by InstantlyClaw. Send me any message and I will get your OpenClaw agent on it.'
  );
});

bot.on('message', async (msg) => {
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const sessionKey = `telegram-${msg.from.id}`;

  try {
    const reply = await openclaw.chat(
      [{ role: 'user', content: text }],
      { sessionKey }
    );
    await bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error('[openclaw error]', err.message);
    await bot.sendMessage(chatId, 'Something went wrong talking to the agent. Check the server logs.');
  }
});

console.log('lobsterbot running...');
