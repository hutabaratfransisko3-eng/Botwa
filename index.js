const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = '';
let isConnected = false;

// --- 1. MEMBUAT WEB SERVER UNTUK MENAMPILKAN QR ---
app.get('/', async (req, res) => {
    // Jika bot sudah berhasil login
    if (isConnected) {
        return res.send(`
            <html>
                <head><title>Status Bot WA</title></head>
                <body style="background:#121212; color:#00ff00; font-family:sans-serif; text-align:center; padding-top:20%;">
                    <h2>✅ Bot WhatsApp Sudah Terhubung!</h2>
                    <p>Tutup halaman ini. Bot siap menerima perintah !kirimpesan di dalam grup.</p>
                </body>
            </html>
        `);
    }

    // Jika QR belum siap (masih loading)
    if (!currentQR) {
        return res.send(`
            <html>
                <head>
                    <title>Loading QR...</title>
                    <meta http-equiv="refresh" content="5"> <!-- Auto refresh tiap 5 detik -->
                </head>
                <body style="background:#121212; color:#fff; font-family:sans-serif; text-align:center; padding-top:20%;">
                    <h2>⏳ Menunggu QR Code...</h2>
                    <p>Mohon tunggu sebentar, browser akan memuat ulang secara otomatis.</p>
                </body>
            </html>
        `);
    }

    // Jika QR sudah siap, tampilkan ke layar
    try {
        const qrImage = await QRCode.toDataURL(currentQR);
        res.send(`
            <html>
                <head>
                    <title>Scan QR WA Bot</title>
                    <!-- Web akan otomatis refresh setiap 20 detik agar QR selalu yang terbaru -->
                    <meta http-equiv="refresh" content="20">
                </head>
                <body style="background:#121212; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
                    <h2>📱 Scan QR Code Ini di WhatsApp</h2>
                    <div style="background:#fff; padding:15px; border-radius:10px; margin:20px 0;">
                        <img src="${qrImage}" style="width:300px; height:300px;" />
                    </div>
                    <p style="color:#aaa;">Halaman ini otomatis memuat ulang (refresh) tiap 20 detik.</p>
                </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send('Terjadi kesalahan saat memuat gambar QR.');
    }
});

// Wajib bind ke 0.0.0.0 agar dikenali proxy Railway
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=============================================================`);
    console.log(`🌐 WEB SERVER AKTIF!`);
    console.log(`👉 Buka Tab 'Settings' di Railway -> 'Networking' -> Klik URL Domain kamu`);
    console.log(`=============================================================\n`);
    
    // Inisialisasi Bot WhatsApp SETELAH web server jalan
    client.initialize();
});

// --- 2. LOGIKA BOT WHATSAPP ---
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
            '--disable-gpu',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
    }
});

// Saat QR baru muncul dari server WhatsApp
client.on('qr', (qr) => {
    currentQR = qr;
    console.log('🔄 QR Code baru tersedia! Silakan buka URL Web kamu.');
});

// Saat berhasil login
client.on('ready', () => {
    currentQR = ''; 
    isConnected = true;
    console.log('✅ Bot WhatsApp berhasil terhubung!');
});

// Fitur perintah !kirimpesan
client.on('message', async (message) => {
    try {
        const chat = await message.getChat();
        if (!chat.isGroup) return; // Hanya merespons di grup

        const args = message.body.trim().split(' ');
        const command = args[0].toLowerCase();

        if (command === '!kirimpesan') {
            const textContent = message.body.slice(11).trim();
            const parts = textContent.split('|').map(p => p.trim());

            if (parts.length < 3) {
                await message.reply('❌ Format: `!kirimpesan <pesan> | <jeda_menit> | <jumlah_pesan>`');
                return;
            }

            const pesan = parts[0];
            const jedaMenit = parseFloat(parts[1]);
            const jumlahPesan = parseInt(parts[2]);

            if (isNaN(jedaMenit) || isNaN(jumlahPesan) || jedaMenit <= 0 || jumlahPesan <= 0) {
                await message.reply('❌ Jeda dan jumlah pesan harus berupa angka positif!');
                return;
            }

            await message.reply(`✅ Mengirim pesan ${jumlahPesan}x setiap ${jedaMenit} menit.`);

            let terkirim = 0;
            const intervalMs = jedaMenit * 60 * 1000;

            const intervalId = setInterval(async () => {
                if (terkirim < jumlahPesan) {
                    terkirim++;
                    await chat.sendMessage(`[Otomatis ${terkirim}/${jumlahPesan}]\n\n${pesan}`);
                    
                    if (terkirim === jumlahPesan) {
                        clearInterval(intervalId);
                        await chat.sendMessage('✨ Semua pesan otomatis telah terkirim.');
                    }
                }
            }, intervalMs);
        }
    } catch (error) {
        console.error('Error memproses pesan:', error);
    }
});
