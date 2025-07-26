const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const { recognize } = require('tesseract.js');

const { extractCPI, detectCN } = require('../services/detectionService');
const { formatCPIStatus, formatCNStatus } = require('../utils/formatter');
const { applyWatermark } = require('../services/watermarkService');

const ASK_NAME = 'ASK_NAME';
const ASK_PHOTO = 'ASK_PHOTO';
const userData = {};
let lastChatId = null;

const showStartButton = (chatId, bot) => {
  bot.sendMessage(chatId, 'Klik tombol di bawah untuk memulai:', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Mulai', callback_data: 'mulai_watermark' }]]
    }
  });
};

module.exports = function (bot) {
  bot.onText(/\/start/, (msg) => {
    showStartButton(msg.chat.id, bot);
  });

  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'mulai_watermark') {
      bot.sendMessage(chatId, 'Masukkan ID site (contoh: PAP4203):');
      userData[chatId] = { state: ASK_NAME };
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const state = userData[chatId]?.state;

    if (state === ASK_NAME && msg.text && !msg.text.startsWith('/')) {
      userData[chatId].name = msg.text.trim();
      userData[chatId].state = ASK_PHOTO;
      return bot.sendMessage(chatId, 'Sekarang kirim foto carriernya.');
    }

    if (
      state === ASK_PHOTO &&
      (msg.photo || (msg.document && msg.document.mime_type?.startsWith('image/')))
    ) {
      const name = userData[chatId].name;

      try {
        const fileId = msg.photo ? msg.photo.at(-1).file_id : msg.document.file_id;
        const fileLink = await bot.getFileLink(fileId);
        const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        const meta = await sharp(imageBuffer).metadata().catch(() => null);
        if (!meta) {
          return bot.sendMessage(chatId, '❌ Format gambar tidak didukung atau gambar rusak.');
        }

        const { data: { text } } = await recognize(imageBuffer, 'eng');
        const cpiRaw = extractCPI(text);
        const cnRaw = await detectCN(imageBuffer, text);

        const cnResult = cnRaw ? formatCNStatus(cnRaw) : '❌ Tidak terdeteksi';
        const cpiResult = cpiRaw ? formatCPIStatus(cpiRaw, name) : '❌ Tidak terdeteksi';

        const finalBuffer = await applyWatermark(imageBuffer, name, meta);

        await fs.ensureDir('Result');
        const safeName = name.replace(/\s+/g, '_');
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const tanggal = `${yyyy}${mm}${dd}`;
        const fileName = `${safeName}_${tanggal}.jpg`;
        const filePath = path.join('Result', fileName);
        await fs.writeFile(filePath, finalBuffer);

        const caption = `✅ Selesai! Silakan dikirimkan.\n\n${name}\n• C/N: ${cnResult}\n• CPI: ${cpiResult}`;
        await bot.sendPhoto(chatId, filePath, { caption });

        await fs.ensureDir('logs');
        const logPath = path.join('logs', `log_${tanggal}.txt`);
        const logLine = `${new Date().toLocaleString('id-ID')} - ${name} | C/N: ${cnResult} | CPI: ${cpiResult}\n`;
        await fs.appendFile(logPath, logLine);

        lastChatId = chatId;
      } catch (err) {
        console.error('❌ Gagal:', err);
        bot.sendMessage(chatId, `❌ Gagal memproses gambar: ${err.message}`);
      }

      userData[chatId] = null;
      showStartButton(chatId, bot);
    }
  });
};
