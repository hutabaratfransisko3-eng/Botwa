# Gunakan Node.js versi 18 berbasis Linux Debian
FROM node:18-slim

# Instal git (wajib untuk npm install dari GitHub) beserta Chromium dan dependensinya
RUN apt-get update && apt-get install -y \
    git \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Beri tahu Puppeteer untuk menggunakan Chromium yang baru diinstal
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Buat direktori kerja di dalam container
WORKDIR /usr/src/app

# Salin file konfigurasi dan instal dependensi npm
COPY package*.json ./
RUN npm install

# Salin seluruh kode bot ke dalam container
COPY . .

# Jalankan bot
CMD [ "npm", "start" ]
