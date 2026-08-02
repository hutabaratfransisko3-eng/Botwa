const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
// Railway membaca PORT dari environment secara otomatis
const PORT = process.env.PORT || 3000;

let currentQR = '';

// Route Halaman QR
app.get('/', async (req, res) => {
    if (!currentQR) {
        return res.send(`
            <html>
                <head><title>WA Bot Status</title></head>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background:#111; color:#fff;">
                    <h2>QR Code belum tersedia atau Bot SUDAH TERHUBUNG!</h2>
                    <p>Cek halaman ini secara berkala atau periksa Deploy Logs.</p>
                </body>
            </html>
        `);
    }
    try {
        const qrImage = await QRCode.toDataURL(currentQR);
        res.send(`
            <html>
                <head><title>Scan QR WA Bot</title></head>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background:#111; color:#fff;">
                    <h2>Scan QR Code Ini di WhatsApp</h2>
                    <img src="${qrImage}" style="width:300px; height:300px; border:10px solid white; border-radius:10px;" />
                    <p style="margin-top:15px;">Refresh halaman jika QR tidak bisa discan / expired.</p>
                </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send('Error generating QR Code');
    }
});

// Wajib bind ke host '0.0.0.0' agar Railway bisa mendeteksi web server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Express berhasil berjalan di port ${PORT}`);
    
    // Inisialisasi Puppeteer SETELAH web server aktif
    console.log('Memulai inisialisasi WhatsApp Client...');
    client.initialize();
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

client.on('qr', (qr) => {
    currentQR = qr;
    console.log('--- QR CODE BARU SIAP DI SCAN VIA WEB ---');
});

client.on('ready', () => {
    currentQR = '';
    console.log('✅ Bot WhatsApp berhasil terhubung!');
});

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
});                        clearInterval(intervalId);
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
