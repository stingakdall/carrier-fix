const sharp = require('sharp');
const getPixels = require('get-pixels');
const Tesseract = require('tesseract.js');

function extractCPI(text) {
  const match = text.match(/cross\s*pol\s*delta\s*C\/No.*?(-?\d+\.\d+)/i);
  return match ? match[1] : null;
}

async function detectCN(imageBuffer, ocrText) {
  return new Promise((resolve, reject) => {
    getPixels(imageBuffer, 'image/jpeg', (err, pixels) => {
      if (err) return reject(err);

      const [width, height] = [pixels.shape[0], pixels.shape[1]];
      const redThreshold = 200;
      const candidates = [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (width * y + x) * 4;
          const r = pixels.data[idx];
          const g = pixels.data[idx + 1];
          const b = pixels.data[idx + 2];
          if (r > redThreshold && g < 80 && b < 80) {
            candidates.push({ x, y });
          }
        }
      }

      if (candidates.length === 0) {
        const matches = ocrText.match(/(\d{2,}\.\d+)\s*dB/gi);
        if (!matches || matches.length === 0) return resolve(null);
        const values = matches.map(m => parseFloat(m));
        return resolve(Math.max(...values));
      }

      const minX = Math.max(Math.min(...candidates.map(p => p.x)) - 10, 0);
      const maxX = Math.min(Math.max(...candidates.map(p => p.x)) + 10, width);
      const minY = Math.max(Math.min(...candidates.map(p => p.y)) - 10, 0);
      const maxY = Math.min(Math.max(...candidates.map(p => p.y)) + 10, height);
      const cropWidth = maxX - minX;
      const cropHeight = maxY - minY;

      if (cropWidth < 3 || cropHeight < 3) return resolve(null);

      sharp(imageBuffer)
        .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
        .greyscale()
        .toBuffer()
        .then(buf => Tesseract.recognize(buf, 'eng'))
        .then(({ data: { text } }) => {
          const match = text.match(/(\d{2,}\.\d+)\s*dB/i);
          if (match) return resolve(parseFloat(match[1]));

          const matches = ocrText.match(/(\d{2,}\.\d+)\s*dB/gi);
          if (!matches || matches.length === 0) return resolve(null);
          const values = matches.map(m => parseFloat(m));
          return resolve(Math.max(...values));
        })
        .catch(reject);
    });
  });
}

module.exports = {
  extractCPI,
  detectCN
};
