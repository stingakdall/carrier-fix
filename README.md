# 📦 Mantepp niii

> Telegram bot untuk mendeteksi **C/N** dan **CPI** dari gambar menggunakan **OCR (Tesseract.js)**, menambahkan **watermark otomatis**, menyimpan hasil gambar ke folder `Result`, dan mencatat log ke folder `logs`.

---

## 🚀 Fitur Utama

### ✅ Deteksi Otomatis dari Gambar

- 📤 Kirim gambar ke bot.
- 🔍 Bot akan menjalankan OCR menggunakan `Tesseract.js`.
- 🔎 Deteksi nilai **C/N** dan **CPI** dari teks pada gambar.

### ✅ Note

- Menentukan apakah nilai **C/N** dan **CPI** termasuk **OK** atau **NOK** berdasarkan **ambang batas**.
- Ambang batas **CPI** menyesuaikan dengan nama site (contoh: `PAP`, `MLU`, `MLA`).

### ✅ Penyimpanan & Log Otomatis

- Gambar hasil diproses disimpan ke folder `📁 Result`.
- Hasil log ditulis ke `📁 logs/log_YYYYMMDD.txt`.

---

## 🛠️ Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/stingakdall/carriermantap.git
cd carriermantap
```

# 2. Install dependencies
npm install

# 3. Buat file .env
echo TELEGRAM_TOKEN=token_kamu >> .env

# 4. Jalankan bot
pm2 start ecosystem.config.js

# 5. Simpan agar auto-start
pm2 save

> *Pastikan kamu sudah mengaktifkan bot Telegram-mu via [@BotFather](https://t.me/BotFather).*

---

## 📦 Dependencies

| Paket | Fungsi |
|-------|--------|
| `node-telegram-bot-api` | Menghubungkan bot Telegram |
| `tesseract.js` | Optical Character Recognition (OCR) |
| `jimp` | Pengolahan gambar dan watermark |
| `fs-extra` | Manajemen file dan folder |
| `path` | Utilitas path OS |
| `get-pixels` | Membaca pixel gambar untuk analisis |
| `axios` | Mengunduh gambar dari URL |
| `dotenv` | Memuat token dari `.env` |
| `sharp` & `@napi-rs/canvas` | (Opsional) pengolahan gambar tambahan |
| `nodemon` | Live reload saat pengembangan |

---

## 🧠 Cara Kerja Bot

1. Pengguna mengirim gambar ke bot.
2. Bot memproses gambar:
   - Unduh file gambar
   - Jalankan OCR
   - Ekstrak nilai C/N dan CPI
   - Evaluasi status (OK/NOK)
   - Tambahkan watermark
   - Simpan hasil ke folder `Result`
   - Catat hasil ke file log
3. Balas hasil ke user di Telegram

---

## 📌 Contoh Hasil Log

📄 `logs/log_20250725.txt`

```
25/07/2025 15:02:10 - SITE-001 | C/N: 42.55 dB (OK) | CPI: 29.99 dB (NOK)
25/07/2025 15:04:30 - MLU-003 | C/N: ❌ Tidak terdeteksi | CPI: 32.00 dB (OK)
```

---

## 📎 Catatan Tambahan

- Gunakan gambar yang tajam dan jelas agar OCR akurat.
- Site dengan awalan `MLU`, `PAP`, `MLA` menggunakan ambang CPI = **33 dB**.
- Site lainnya menggunakan ambang CPI = **30 dB**.
- Tanggal watermark mengikuti waktu lokal server saat file diproses.

---

## 👨‍💻 Pengembang

**Afdal Zaki Asshiddiq**  
📧 afdalzaki23@gmail.com  
📍 Indonesia

---

## 📜 Lisensi

MIT License © 2025