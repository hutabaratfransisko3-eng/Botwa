const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Ambil nomor dari variabel Railway
let NOMOR_HP = process.env.NOMOR_HP_BOT || '';

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

let pairingCodeSent = false;

client.on('qr', async (qr) => {
    // Tampilkan QR versi kecil di log
    console.log('\n--- QR CODE (BACKUP) ---');
    qrcode.generate(qr, { small: true });

    if (!NOMOR_HP) {
        console.log('\n⚠️ NOMOR_HP_BOT belum diisi di Variables Railway!');
        return;
    }

    if (!pairingCodeSent) {
        pairingCodeSent = true;

        // Bersihkan karakter selain angka
        const cleanNumber = NOMOR_HP.replace(/[^0-9]/g, '');
        console.log(`\n⏳ Mengajukan Pairing Code untuk nomor: ${cleanNumber}...`);

        // Beri jeda 6 detik agar browser Puppeteer siap sepenuhnya
        setTimeout(async () => {
            try {
                const code = await client.requestPairingCode(cleanNumber);
                console.log('\n=============================================');
                console.log(`🔥 KODE TAUTAN WHATSAPP ANDA: ${code}`);
                console.log('=============================================\n');
            } catch (err) {
                console.error('\n❌ Gagal meminta Pairing Code:', err);
                // Reset agar bisa mencoba lagi pada siklus QR berikutnya
                pairingCodeSent = false; 
            }
        }, 6000);
    }
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp berhasil terhubung dan siap digunakan!');
});

// Perintah !kirimpesan
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
                    'Contoh: `!kirimpesan Tes Pesan | 1 | 3`'
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

            await message.reply(`✅ Perintah diterima! Pesan akan dikirim ${jumlahPesan}x dengan jeda ${jedaMenit} menit.`);

            let terkirim = 0;
            const intervalMs = jedaMenit * 60 * 1000;

            const intervalId = setInterval(async () => {
                if (terkirim < jumlahPesan) {
                    terkirim++;
                    await chat.sendMessage(`[Pesan Otomatis ${terkirim}/${jumlahPesan}]\n\n${pesan}`);
                    
                    if (terkirim === jumlahPesan) {
                        clearInterval(intervalId);
                        await chat.sendMessage('✨ Semua pesan otomatis selesai dikirim.');
                    }
                }
            }, intervalMs);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

client.initialize();
