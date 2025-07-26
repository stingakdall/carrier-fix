const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

async function applyWatermark(imageBuffer, name, meta) {
  const canvas = createCanvas(meta.width, meta.height);
  const ctx = canvas.getContext('2d');

  const baseImg = await loadImage(imageBuffer);
  ctx.drawImage(baseImg, 0, 0);

  ctx.font = '32px sans-serif';
  ctx.fillStyle = 'white';

  const dateNow = new Date().toLocaleDateString('id-ID');
  ctx.fillText(name, meta.width * 0.25, meta.height * 0.5);
  ctx.fillText(dateNow, meta.width * 0.25, meta.height * 0.5 + 42);

  const logoNmcPath = path.join(__dirname, '../assets/nmc.png');
  const logoPsnPath = path.join(__dirname, '../assets/psn.png');

  const logoNmc = await loadImage(logoNmcPath);
  const logoPsn = await loadImage(logoPsnPath);

  ctx.drawImage(logoNmc, 40, 15, 120, 120);
  ctx.drawImage(logoPsn, 170, 15, 120, 120);

  return canvas.toBuffer('image/jpeg');
}

module.exports = {
  applyWatermark
};
