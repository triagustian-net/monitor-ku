# 🖥️ Monitor Ku

**Monitor Ku** adalah aplikasi monitoring jaringan berbasis web yang ringan dan mudah digunakan. Dibangun dengan [Bun](https://bun.sh) runtime.

![Dashboard](https://img.shields.io/badge/status-active-brightgreen)
![Bun](https://img.shields.io/badge/runtime-Bun-black)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Fitur

- 📡 **Multi-tipe monitoring** — Ping, HTTP/HTTPS, TCP, DNS, SMTP, SNMP, RADIUS, Tailscale
- 📊 **Grafik history** — Response time dengan range 1 jam hingga 1 tahun
- ⬇️ **Riwayat downtime** — Jam & durasi downtime tercatat otomatis
- ✈️ **Notifikasi Telegram** — Alert otomatis saat DOWN/RECOVERY
- 🗺️ **Network Map** — Visualisasi topologi jaringan
- 🎫 **Ticket Management** — Kelola tiket gangguan
- 🖥️ **Asset Management** — Inventaris perangkat jaringan
- 🔐 **Multi User** — Role Admin & Viewer
- ⚙️ **Konfigurasi dari dashboard** — Tidak perlu edit file

---

## 📋 Requirements

- **OS**: Linux (Debian, Ubuntu, CentOS) / Windows 10+ / macOS
- **Bun**: >= 1.0
- **RAM**: Minimal 256MB
- **Disk**: Minimal 100MB

---

## 🚀 Instalasi

### Linux / macOS

```bash
# 1. Clone repository
git clone https://github.com/USERNAME/monitor-ku.git
cd monitor-ku

# 2. Install
chmod +x install.sh
./install.sh
```

### Windows

```powershell
# 1. Clone repository
git clone https://github.com/USERNAME/monitor-ku.git
cd monitor-ku

# 2. Install Bun (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# 3. Jalankan
bun server.ts
```

---

## 🔧 Jalankan Manual

```bash
# Jalankan langsung
bun server.ts

# Jalankan di background dengan PM2
npm install -g pm2
pm2 start --name monitor-ku -- bun server.ts
pm2 save && pm2 startup
```

Akses di browser: **http://localhost:3000**

---

## 🔑 Login Default

| Username | Password |
|----------|----------|
| admin | monitor123 |

> ⚠️ **Segera ganti password** setelah login pertama melalui tombol **🔑 Ganti Password** di pojok kanan atas.

---

## 📁 Struktur File

```
monitor-ku/
├── server.ts          # Server utama
├── public/
│   ├── index.html     # Dashboard
│   └── login.html     # Halaman login
├── targets.json       # Data target monitoring
├── users.json         # Data user
├── assets.json        # Data aset
├── tickets.json       # Data tiket
├── telegram.json      # Konfigurasi Telegram
├── netmap.json        # Data network map
├── history/           # Riwayat monitoring harian
├── install.sh         # Script instalasi Linux
└── README.md
```

---

## ⚙️ Konfigurasi

Semua konfigurasi bisa dilakukan langsung dari dashboard:

- **Target monitoring** — Tab Dashboard → Tambah Target
- **Notifikasi Telegram** — Tab Settings → masukkan Bot Token & Chat ID
- **User management** — Tab Users (admin only)
- **Network Map** — Tab Network Map → tambah node & koneksi

---

## 🔄 Update

```bash
cd monitor-ku
git pull
pm2 restart monitor-ku
```

---

## 🛑 Stop / Uninstall

```bash
# Stop
pm2 stop monitor-ku

# Hapus dari PM2
pm2 delete monitor-ku

# Hapus aplikasi
cd ..
rm -rf monitor-ku
```

---

## 📞 Troubleshooting

**Port 3000 sudah dipakai:**
```bash
# Ganti PORT di server.ts baris: const PORT = 3000;
```

**Tidak bisa diakses dari PC lain:**
```bash
# Pastikan firewall mengizinkan port 3000
sudo ufw allow 3000
```

**PM2 tidak ditemukan:**
```bash
npm install -g pm2
# atau
bun install -g pm2
```

---
