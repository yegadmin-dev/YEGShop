# YEG Production — Sistem Pemesanan Map

Paket Google Apps Script + Google Sheets dengan halaman pemesanan dan Portal Admin.

## Fitur pelanggan
- Harga otomatis untuk K-13 dan Full-Colour.
- Kategori: 1–49 pcs (kolom 3), 50–100 pcs (kolom 2), 101+ pcs (kolom 1).
- DP fleksibel 1–100% dan simulasi sisa pembayaran.
- Plastik Buram/Bening untuk kedua jenis map.
- K-13: pilihan warna, nama/alamat institusi, logo, jenis kotak nama, dan upload foto jika memilih "Kotak nama + foto".
- Upload bukti transfer DP.
- Nomor pesanan otomatis.
- File JPG/PNG maksimal 10 MB per file disimpan privat di Google Drive.

## Fitur Portal Admin
- Buka melalui URL deployment ditambah `?page=admin`.
- Login menggunakan PIN rahasia yang disimpan di Apps Script Script Properties.
- Melihat daftar dan detail pesanan, pencarian, ringkasan status.
- Memperbarui status pembayaran, status produksi, dan catatan internal.
- Membuka bukti transfer.
- Menyiapkan naskah WhatsApp/BC untuk konfirmasi pesanan, DP, update produksi, atau pesanan selesai.
- CTA "Buka WhatsApp Pemesan" membuka chat dengan naskah yang sudah terisi.
- CTA "Unduh Struk PNG" membuat struk transaksi berbentuk gambar untuk dilampirkan admin di WhatsApp.
- CTA salin naskah BC untuk diedit atau ditempel.

PENTING: WhatsApp dikirim manual oleh admin. Link `wa.me` hanya membuka chat dan mengisi teks; WhatsApp tidak mengizinkan link tersebut melampirkan file gambar secara otomatis. Admin perlu mengunduh Struk PNG, melampirkannya di chat, lalu menekan Kirim sendiri. Sistem ini tidak mengirim pesan WhatsApp otomatis atau melakukan broadcast massal.

## Cara memasang
1. Buat Google Sheets baru bernama `Database Pesanan YEG Production`.
2. Buka Extensions > Apps Script.
3. Hapus isi `Code.gs`, lalu salin isi file `Code.gs` dari paket ini.
4. Klik + > HTML, beri nama persis `Index`, lalu salin isi `Index.html`.
5. Buat satu file HTML lagi bernama persis `Admin`, lalu salin isi `Admin.html`.
6. Simpan. Jalankan fungsi `setupDatabase` dari editor Apps Script dan setujui izin Google Sheets/Drive.
7. Kembali ke Google Sheets. Pastikan lima tab dibuat: Orders, Payments, Production, Price_Reference, Settings.
8. Di Apps Script > Project Settings > Script Properties, tambahkan properti:
   - Property: `ADMIN_PIN`
   - Value: PIN rahasia acak minimal 16 karakter, tanpa spasi di awal/akhir.
   Jangan memasukkan PIN ke sheet, HTML, atau membagikannya kepada pemesan. Jangan gunakan PIN contoh atau kata sandi yang mudah ditebak.
9. Deploy > New deployment > Web app.
10. Execute as: Me. Tentukan siapa yang dapat membuka halaman pemesanan sesuai kebutuhan (misalnya Anyone jika form memang publik).
11. Salin URL deployment. Halaman pemesanan memakai URL utama. Portal admin memakai URL yang sama dengan akhiran `?page=admin`.
12. Berikan URL portal admin dan PIN hanya kepada admin tepercaya. Admin harus membuka portal dari akun Google yang memiliki akses ke file bukti transfer di Drive.
13. Uji satu pesanan percobaan, buka portal admin, pilih pesanan, ubah status, unduh struk PNG, dan coba CTA WhatsApp ke nomor uji.

## Informasi rekening
SeaBank — 901705659816 — Mochamad Ridhwan Mubarok.

## Struktur database
- Orders: identitas pemesan, spesifikasi, harga, DP, tautan upload, status, catatan admin.
- Payments: ringkasan pembayaran dan verifikasi DP.
- Production: spesifikasi dan alur status produksi.
- Price_Reference: seluruh tabel harga K-13 dan Full-Colour.
- Settings: identitas penyedia dan konfigurasi operasional non-rahasia.

## Keamanan dan catatan operasional
- Jangan menaruh ADMIN_PIN di spreadsheet atau kode HTML. Simpan hanya di Script Properties.
- Jangan membagikan folder upload Drive dengan akses publik.
- File upload privat; admin perlu memakai akun yang dapat mengakses file Drive tersebut.
- Jalankan aplikasi sebagai pemilik spreadsheet agar Apps Script dapat menulis database dan menyimpan file.
- Jangan membagikan hak editor spreadsheet kepada pihak yang tidak perlu.
- Batas 10 MB divalidasi di browser dan server; tetap uji pada deployment aktual karena batas payload Apps Script dapat berubah menurut ukuran/jenis file dan akun. Jika upload gagal, turunkan batas per file.
- Status pembayaran/produksi diperbarui manual oleh admin melalui Portal Admin.
- Pastikan ejaan warna "Fur" dan detail produk sesuai sebelum form dibagikan.

Catatan template XLSX: pada versi template spreadsheet yang lebih lama mungkin masih ada baris `admin_whatsapp` kosong di tab Settings. Baris itu tidak dipakai oleh Portal Admin dan boleh dibiarkan kosong atau dihapus. PIN admin tetap hanya disimpan di Script Properties dengan nama `ADMIN_PIN`.
