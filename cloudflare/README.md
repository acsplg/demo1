# Hosting dengan Cloudflare Pages

1. Push repository ini ke GitHub.
2. Masuk Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Pilih repository.
4. Untuk website statis HTML/CSS/JS ini, build command dapat dikosongkan; output directory gunakan `/` atau direktori proyek sesuai pengaturan Cloudflare.
5. Setelah deploy, tes URL `pages.dev`.

## Integrasi backend
Sebelum toko aktif, buat Cloudflare Pages Function atau Worker untuk menjadi API proxy. Proxy server-side yang aman harus:
- membaca secret dari environment variables, bukan dari browser;
- membatasi endpoint admin ke autentikasi admin;
- memvalidasi semua SKU dan kuantitas di server;
- menghindari duplikasi pesanan dan konfirmasi ganda;
- mengirim respons JSON dengan CORS yang dibatasi ke domain toko;
- mengirim permintaan ke backend Google Apps Script atau memakai Google Sheets API secara server-side.

Jangan memasukkan `ADMIN_KEY`, service account credentials, atau token rahasia ke `app.js`/`admin.js`. Jangan menandai integrasi produksi siap sebelum API createOrder, konfirmasi, dan CORS diuji dari domain live.
