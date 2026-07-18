# Deploy DentaLab di Coolify

Versi ini menyimpan akun, sesi, pekerjaan, stok, pembayaran, dan laporan di database SQLite pada server.

## Pengaturan aplikasi

- Build Pack: `Dockerfile`
- Base Directory: `/`
- Dockerfile Location: `/Dockerfile`
- Port Exposes: `3000`
- Domain: `https://lab.simklinikaryo.com`

## Penyimpanan permanen (wajib)

Di menu **Persistent Storage** Coolify, tambahkan volume:

- Source: `dentalab-data`
- Destination: `/data`

Tanpa volume `/data`, database akan kembali kosong setiap container dibuat ulang. Setelah menambahkan volume, lakukan **Redeploy** satu kali.

## Aktivasi

Saat halaman pertama dibuka, buat Owner pertama. Setelah masuk, buka **Akun & Akses** untuk menambahkan maksimal satu Owner lagi, Admin, Teknisi, Asisten Teknisi, dan Kurir.
