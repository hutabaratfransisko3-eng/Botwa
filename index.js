const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = '';

// Jalankan web server kecil
app.get('/', async (req, res) => {
    if (!currentQR) {
        return res.send('<h2>QR Code belum siap atau Bot sudah terhubung!</h2>');
    }
    try {
        const qrImage = await QRCode.toDataURL(currentQR);
        res.send(`
            <html>
                <head><title>Scan QR WA Bot</title></head>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                    <h2>Scan QR Code Ini di WhatsApp</h2>
                    <img src="${qrImage}" style="width:300px; height:300px;" />
                    <p>Refresh halaman jika QR kadaluarsa.</p>
                </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send('Error generating QR Code');
    }
});

app.listen(PORT, () => {
    console.log(`Server QR berjalan di port ${PORT}`);
});

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

// Tangkap QR Code
client.on('qr', (qr) => {
    currentQR = qr;
    console.log('--- QR CODE BARU TERSEDIA ---');
    console.log('Buka URL domain Railway kamu untuk melakukan scan QR!');
});

// Ketika Bot Terhubung
client.on('ready', () => {
    currentQR = ''; // Hapus QR setelah berhasil login
    console.log('✅ Bot WhatsApp berhasil terhubung dan siap digunakan!');
});

// Logika Perintah !kirimpesan
client.on('message', async (message) => {
    try {
        const chat = await message.getChat();
        if (!chat.isGroup) return;

        const args = message.body.trim().split(' ');
        const command = args[0].toLowerCase();

        if (command === '!kirimpesan') {
            const textContent = message.body.slice(11).trim();
            const parts = textContent.split('|').map(p => p.trim());

            if (parts.length < 3) {
                await message.reply(
                    '❌ *Format salah!*\n\n' +
                    'Format: `!kirimpesan <pesan> | <jeda_menit> | <jumlah_pesan>`\n' +
                    'Contoh: `!kirimpesan Test Pesan | 1 | 3`'
                );
                return;
            }

            const pesan = parts[0];
            const jedaMenit = parseFloat(parts[1]);
            const jumlahPesan = parseInt(parts[2]);

            if (isNaN(jedaMenit) || isNaN(jumlahPesan) || jedaMenit <= 0 || jumlahPesan <= 0) {
                await message.reply('❌ Jeda waktu dan jumlah pesan harus angka positif!');
                return;
            }

            await message.reply(`✅ Pesan akan dikirim ${jumlahPesan}x dengan jeda ${jedaMenit} menit.`);

            let terkirim = 0;
            const intervalMs = jedaMenit * 60 * 1000;

            const intervalId = setInterval(async () => {
                if (terkirim < jumlahPesan) {
                    terkirim++;
                    await chat.sendMessage(`[Pesan Otomatis ${terkirim}/${jumlahPesan}]\n\n${pesan}`);
                    
                    if (terkirim === jumlahPesan) {
                        clearInterval(intervalId);
                        await chat.sendMessage('✨ Semua pesan selesai dikirim.');
                    }
                }
            }, intervalMs);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

client.initialize();
