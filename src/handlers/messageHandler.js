const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const { recognize } = require('tesseract.js');
const { tmpdir } = require('os');  // Untuk membuat file sementara

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

// Fungsi untuk mendapatkan tanggal log yang tersedia
const getAvailableLogDates = () => {
  const logsDir = 'logs';
  return fs.readdirSync(logsDir)
    .filter(file => file.startsWith('log_') && file.endsWith('.txt'))
    .map(file => file.replace('log_', '').replace('.txt', ''));
};

module.exports = function (bot) {
  bot.onText(/\/start/, (msg) => {
    showStartButton(msg.chat.id, bot);
  });

  // Menangani callback untuk tombol "Mulai"
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'mulai_watermark') {
      bot.sendMessage(chatId, 'Masukkan ID site (contoh: PAP4203):');
      userData[chatId] = { state: ASK_NAME };
    }
  });

  // Menangani perintah /log untuk menampilkan tanggal log yang tersedia
  bot.onText(/\/log/, (msg) => {
    const chatId = msg.chat.id;
    const availableDates = getAvailableLogDates();

    if (availableDates.length > 0) {
      const keyboard = availableDates.map(date => [{ text: date, callback_data: `show_log_${date}` }]);
      bot.sendMessage(chatId, 'Pilih tanggal untuk melihat log:', {
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      bot.sendMessage(chatId, '❌ Tidak ada log yang tersedia.');
    }
  });

  // Menangani pemilihan tanggal log dan menampilkan konten + file
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const callbackData = query.data;

    if (callbackData.startsWith('show_log_')) {
      const logDate = callbackData.replace('show_log_', '');
      const logFilePath = path.join('logs', `log_${logDate}.txt`);

      try {
        if (fs.existsSync(logFilePath)) {
          // Membaca konten log
          const logContent = await fs.readFile(logFilePath, 'utf8');

          // Mengirimkan konten log sebagai pesan teks
          bot.sendMessage(chatId, `Log untuk tanggal ${logDate}:\n\n${logContent}`);

          // Mengirimkan file log sebagai dokumen
          await bot.sendDocument(chatId, logFilePath, {
            caption: `File log untuk tanggal ${logDate}`,
          });
        } else {
          bot.sendMessage(chatId, `❌ Log untuk tanggal ${logDate} tidak ditemukan.`);
        }
      } catch (err) {
        console.error('❌ Gagal membaca log:', err);
        bot.sendMessage(chatId, '❌ Gagal mengambil log.');
      }

      // Selalu tampilkan tombol "Mulai" setelah proses selesai
      showStartButton(chatId, bot);
    }
  });

  // Menangani pesan (foto atau dokumen) untuk watermarking
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const state = userData[chatId]?.state;

    if (state === ASK_NAME && msg.text && !msg.text.startsWith('/')) {
      const rawName = msg.text.trim();
      const upperName = rawName.toUpperCase();
      
      const cleanName = (upperName.startsWith('PAP') || upperName.startsWith('MLA') || upperName.startsWith('MLU'))
        ? upperName.replace(/\s+/g, '') 
        : upperName;

      userData[chatId].name = cleanName;
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

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');  // Hari (dengan leading zero)
        const mm = String(now.getMonth() + 1).padStart(2, '0');  // Bulan (dengan leading zero)
        const yyyy = now.getFullYear();  // Tahun
        const tanggal = `${dd}-${mm}-${yyyy}`;  // Format tanggal menjadi dd-mm-yyyy
        const fileName = `${name}_${tanggal}.jpg`;  // Menyusun nama file: nama_site_dd-mm-yyyy.jpg

        console.log("Nama file yang akan dikirim:", fileName);  // Debugging: Pastikan nama file benar

        // Simpan file sementara
        const tempFilePath = path.join(tmpdir(), fileName);
        await fs.writeFile(tempFilePath, finalBuffer);

        // Kirim hasil langsung sebagai dokumen agar bisa di-save dengan nama yang sesuai
        await bot.sendDocument(chatId, tempFilePath, {
          filename: fileName,
          caption: `✅ Selesai! Silakan dikirimkan.\n\n${name}\n• C/N: ${cnResult}\n• CPI: ${cpiResult}`,
        });

        // Hapus file sementara setelah dikirim
        await fs.remove(tempFilePath);

        // Logging
        await fs.ensureDir('logs');
        const logPath = path.join('logs', `log_${tanggal}.txt`);  // Format log file menjadi log_dd-mm-yyyy.txt
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
