# Setup Google Sheets + Apps Script

## 1. Buat spreadsheet
Buat spreadsheet Google baru, lalu buat empat tab dengan nama persis dan header berikut pada baris pertama.

### Produk
`SKU | Nama | Kategori | Harga | Stok | Foto | Aktif`

Contoh: `BRG001 | Botol Minum | Perlengkapan | 25000 | 20 | https://... | TRUE`

### Pesanan
`OrderID | Dibuat | NamaPelanggan | Catatan | Total | Status`

### DetailPesanan
`OrderID | SKU | NamaProduk | Jumlah | HargaSatuan | Subtotal`

### MutasiStok
`Waktu | SKU | StokSebelum | Perubahan | StokSesudah | Alasan | Referensi`

## 2. Buat Apps Script
1. Dari spreadsheet, pilih Extensions → Apps Script.
2. Salin isi `Code.gs` ke editor.
3. Project Settings → Script Properties, tambahkan:
   - `SPREADSHEET_ID`: bagian ID pada URL spreadsheet.
   - `ADMIN_KEY`: rahasia acak panjang yang tidak dibagikan ke pelanggan.
4. Jalankan fungsi sederhana dari editor dan berikan izin yang diminta.

## 3. Deploy
Deploy → New deployment → Web app. Pilih eksekusi sebagai pemilik script. Tentukan akses sesuai kebutuhan. URL hasil deployment adalah URL backend.

**Keamanan:** Apps Script web app dengan akses publik harus dianggap sebagai endpoint internet. Jangan mengandalkan parameter rahasia di URL sebagai satu-satunya perlindungan produksi; URL dapat tersimpan di log/history. Gunakan autentikasi yang lebih kuat/proxy server-side untuk admin.

## 4. Penting sebelum produksi
- Kode ini starter, belum audit keamanan produksi.
- Konfirmasi stok memakai `LockService` dan validasi ulang, tetapi Google Sheets bukan database transaksi penuh. Uji crash/partial writes dan lakukan backup.
- Untuk browser pada domain Cloudflare Pages, respons Apps Script dapat mengalami masalah CORS. Gunakan Cloudflare Pages Functions/Worker sebagai proxy backend atau sajikan UI melalui Apps Script. Jangan mengatasi CORS dengan membuka endpoint admin tanpa perlindungan.
- Buat alur retur untuk pesanan CONFIRMED secara terpisah; jangan mengubah status saja karena stok perlu dikembalikan dengan mutasi yang terlacak.
- Checkout WhatsApp saja tidak menjamin pesanan tercatat otomatis. Integrasi produksi perlu mengirim pesanan ke endpoint `createOrder` sebelum membuka WhatsApp dan memasukkan nomor pesanan pada pesan.
