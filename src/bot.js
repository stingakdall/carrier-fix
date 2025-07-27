require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const messageHandler = require('./handlers/messageHandler');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_TOKEN not set in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
messageHandler(bot);

let lastChatId = null;

// Cron kirim log harian jam 00:00 WIB
cron.schedule('0 0 * * *', async () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const logPath = path.join(__dirname, '../logs', `log_${dd}-${mm}-${yyyy}.txt`);

  if (lastChatId && fs.existsSync(logPath)) {
    await bot.sendDocument(lastChatId, logPath, {
      caption: `📊 Log harian tanggal ${dd}-${mm}-${yyyy}`
    });
  }
}, { timezone: 'Asia/Jakarta' });
