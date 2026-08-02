const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Membaca nomor HP dari Environment Variable Railway
const NOMOR_HP_BOT = process.env.NOMOR_HP_BOT; 

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

// Menangani pembuatan Pairing Code / QR Code
client.on('qr', async (qr) => {
    // 1. Tampilkan QR Code versi kecil di log (backup)
    console.log('\n--- QR CODE (VERSI KECIL) ---');
    qrcode.generate(qr, { small: true });

    // 2. Tampilkan Pairing Code jika nomor HP telah diatur di Variables
    if (NOMOR_HP_BOT) {
        try {
            const code = await client.requestPairingCode(NOMOR_HP_BOT.replace(/[^0-9]/g, ''));
            console.log('\n=============================================');
            console.log(`🔥 KODE TAUTAN WHATSAPP ANDA: ${code}`);
            console.log('=============================================\n');
        } catch (err) {
            console.log('Gagal meminta Pairing Code, silakan gunakan QR di atas.');
        }
    } else {
        console.log('\n⚠️ NOMOR_HP_BOT belum diisi di Variables Railway!');
    }
});

// Notifikasi ketika bot berhasil terhubung
client.on('ready', () => {
    console.log('✅ Bot WhatsApp berhasil terhubung dan siap digunakan!');
});

// Mendengarkan pesan masuk
client.on('message', async (message) => {
    try {
        const chat = await message.getChat();

        // Pastikan perintah hanya berjalan di dalam Grup
        if (!chat.isGroup) return;

        const args = message.body.trim().split(' ');
        const command = args[0].toLowerCase();

        // Perintah: !kirimpesan <pesan> | <jeda_menit> | <jumlah>
        if (command === '!kirimpesan') {
            const textContent = message.body.slice(11).trim();
            const parts = textContent.split('|').map(p => p.trim());

            if (parts.length < 3) {
                await message.reply(
                    '❌ *Format salah!*\n\n' +
                    'Gunakan format:\n' +
                    '`!kirimpesan <pesan> | <jeda_menit> | <jumlah_pesan>`\n\n' +
                    'Contoh:\n' +
                    '`!kirimpesan Pengumuman Penting! | 1 | 3`'
                );
                return;
            }

            const pesan = parts[0];
            const jedaMenit = parseFloat(parts[1]);
            const jumlahPesan = parseInt(parts[2]);

            if (isNaN(jedaMenit) || isNaN(jumlahPesan) || jedaMenit <= 0 || jumlahPesan <= 0) {
                await message.reply('❌ Jeda waktu dan jumlah pesan harus berupa angka positif!');
                return;
            }

            await message.reply(`✅ Perintah diterima! Pesan akan dikirim sebanyak ${jumlahPesan} kali dengan jeda ${jedaMenit} menit.`);

            let terkirim = 0;
            const intervalMs = jedaMenit * 60 * 1000;

            const intervalId = setInterval(async () => {
                if (terkirim < jumlahPesan) {
                    terkirim++;
                    await chat.sendMessage(`[Pesan Otomatis ${terkirim}/${jumlahPesan}]\n\n${pesan}`);
                    
                    if (terkirim === jumlahPesan) {
                        clearInterval(intervalId);
                        await chat.sendMessage('✨ Semua pesan otomatis telah selesai dikirim.');
                    }
                }
            }, intervalMs);
        }
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
    }
});

client.initialize();
