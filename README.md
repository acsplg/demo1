# Toko Online — Starter Project

Website katalog sederhana dengan checkout WhatsApp, GitHub untuk source code, Cloudflare Pages untuk frontend, dan Google Sheets + Apps Script untuk data/inventaris.

## Isi proyek
- `index.html`, `styles.css`, `app.js`: katalog, pencarian, keranjang, checkout WhatsApp.
- `admin.html`, `admin.js`: dashboard admin starter untuk melihat dan mengonfirmasi pesanan.
- `apps-script/Code.gs`: backend Apps Script untuk membaca produk, mencatat pesanan, mengonfirmasi pesanan, serta mutasi stok.
- `apps-script/SETUP.md`: cara menyiapkan Google Sheets dan Apps Script.
- `cloudflare/README.md`: catatan deployment dan proxy.

## Sebelum digunakan
Ini adalah starter yang perlu dikonfigurasi dan diuji sebelum dipakai untuk transaksi nyata. Ganti:
1. `CONFIG.WHATSAPP_NUMBER` di `app.js` dengan nomor WhatsApp bisnis format internasional tanpa `+` (contoh `62812...`).
2. URL backend di `app.js` dan `admin.js` setelah deployment.
3. Kunci admin di Script Properties Apps Script. Jangan pernah menaruh kunci rahasia di frontend publik.

## Catatan arsitektur penting
GitHub adalah repository. Untuk toko aktif, jangan gunakan GitHub Pages sebagai hosting e-commerce. Gunakan Cloudflare Pages atau hosting statis komersial lain.

Untuk integrasi browser lintas domain yang andal, gunakan proxy/server endpoint di Cloudflare Pages Functions atau Cloudflare Worker. Jangan menaruh kredensial Google di JavaScript frontend. Panduan di `cloudflare/README.md` menjelaskan batasan integrasi dan langkah berikutnya.

## Status starter
- Frontend katalog/keranjang: dapat diuji dengan data demo.
- Checkout: membuka WhatsApp dengan pesan terisi.
- Backend Apps Script: contoh backend untuk Sheets, pesanan, konfirmasi, mutasi stok.
- Dashboard admin: perlu URL backend dan kunci admin dikonfigurasi.
- Sebelum produksi: tambahkan proxy API yang aman, autentikasi admin yang kuat, validasi, backup, dan pengujian transaksi bersamaan.
