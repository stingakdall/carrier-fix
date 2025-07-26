const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * Membuat watermark pada gambar: nama + tanggal + logo
 * @param {Buffer} imageBuffer - Buffer dari gambar asli
 * @param {string} name - Nama site atau watermark utama
 * @param {object} meta - Metadata gambar (lebar & tinggi)
 * @returns {Buffer} finalBuffer - Buffer hasil gambar watermark
 */
async function applyWatermark(imageBuffer, name, meta) {
  const canvas = createCanvas(meta.width, meta.height);
  const ctx = canvas.getContext('2d');

  // Gambar utama
  const baseImg = await loadImage(imageBuffer); // ✅ dari buffer, bukan path
  ctx.drawImage(baseImg, 0, 0);

  // Tambahkan teks watermark
  ctx.font = '32px sans-serif';
  ctx.fillStyle = 'white';
  const dateNow = new Date().toLocaleDateString('id-ID');
  ctx.fillText(name, meta.width * 0.25, meta.height * 0.5);
  ctx.fillText(dateNow, meta.width * 0.25, meta.height * 0.5 + 42);

  // Tambahkan logo (buffer aman di Linux)
  const logoNmcPath = path.join(__dirname, '../assets/nmc.png');
  const logoPsnPath = path.join(__dirname, '../assets/psn.png');

  if (await fs.pathExists(logoNmcPath)) {
    const logoNmcBuffer = await fs.readFile(logoNmcPath);
    const logoNmc = await loadImage(logoNmcBuffer);
    ctx.drawImage(logoNmc, 40, 15, 120, 120);
  }

  if (await fs.pathExists(logoPsnPath)) {
    const logoPsnBuffer = await fs.readFile(logoPsnPath);
    const logoPsn = await loadImage(logoPsnBuffer);
    ctx.drawImage(logoPsn, 170, 15, 120, 120);
  }

  // Simpan hasil ke buffer
  const finalBuffer = canvas.toBuffer('image/jpeg');
  return finalBuffer;
}

module.exports = {
  applyWatermark
};

