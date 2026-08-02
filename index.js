const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Inisialisasi client dengan LocalAuth agar sesi tersimpan (tidak perlu scan QR terus-menerus)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
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

// Generate QR Code di terminal
client.on('qr', (qr) => {
    console.log('Scan QR Code di bawah ini menggunakan aplikasi WhatsApp Anda:');
    qrcode.generate(qr, { small: true });
});

// Notifikasi ketika bot berhasil terhubung
client.on('ready', () => {
    console.log('Bot WhatsApp berhasil terhubung dan siap digunakan!');
});

// Mendengarkan pesan masuk
client.on('message', async (message) => {
    try {
        const chat = await message.getChat();

        // Pastikan perintah hanya berjalan di dalam Grup
        if (!chat.isGroup) return;

        const args = message.body.trim().split(' ');
        const command = args[0].toLowerCase();

        // Format Perintah: !kirimpesan <pesan> | <jeda_menit> | <jumlah>
        // Contoh: !kirimpesan Halo, ini pengumuman penting! | 1 | 5
        if (command === '!kirimpesan') {
            // Gabungkan kembali argumen lalu pisahkan dengan simbol pipa (|)
            const textContent = message.body.slice(11).trim();
            const parts = textContent.split('|').map(p => p.trim());

            if (parts.length < 3) {
                await message.reply(
                    '❌ *Format salah!*\n\n' +
                    'Gunakan format:\n' +
                    '`!kirimpesan <pesan> | <jeda_menit> | <jumlah_pesan>`\n\n' +
                    'Contoh:\n' +
                    '`!kirimpesan Halo semuanya! | 1 | 3`'
                );
                return;
            }

            const pesan = parts[0];
            const jedaMenit = parseFloat(parts[1]);
            const jumlahPesan = parseInt(parts[2]);

            // Validasi angka
            if (isNaN(jedaMenit) || isNaN(jumlahPesan) || jedaMenit <= 0 || jumlahPesan <= 0) {
                await message.reply('❌ Jeda waktu dan jumlah pesan harus berupa angka positif!');
                return;
            }

            await message.reply(`✅ Perintah diterima! Pesan akan dikirim sebanyak ${jumlahPesan} kali dengan jeda ${jedaMenit} menit.`);

            let terkirim = 0;
            const intervalMs = jedaMenit * 60 * 1000;

            // Eksekusi pengiriman berulang
            const intervalId = setInterval(async () => {
                if (terkirim < jumlahPesan) {
                    terkirim++;
                    await chat.sendMessage(`[Pesan Otomatis ${terkirim}/${jumlahPesan}]\n\n${pesan}`);
                    console.log(`Pesan terkirim ke grup ${chat.name} (${terkirim}/${jumlahPesan})`);

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

// Jalankan client
client.initialize();