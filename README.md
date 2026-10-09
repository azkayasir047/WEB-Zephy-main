KERJA!
HARUS KERJA!
DANDI


## Cara menjalankan website + CMS artikel

1. Pastikan PostgreSQL menyala dan database di `server/.env` sudah ada (tabel `users` untuk login).
2. Jalankan server:
   ```
   cd server
   npm install
   npm start
   ```
3. Buka **http://localhost:3000** (jangan dibuka pakai Live Server / klik file langsung, karena artikel diambil dari server).
4. Login → Dashboard Admin → **Tambah Artikel**.

Tabel `articles` dibuat otomatis saat server pertama kali jalan (lihat `server/db-init.js`).

### Alur artikel
- **Tulis**: `admin/form-artikel.html` — judul, isi (editor teks), kategori, gambar sampul, ringkasan, penulis.
- **Simpan Draft**: tersimpan, belum tampil ke pengunjung. **Publish**: langsung tampil di `artikel/art.html`.
- **Daftar**: `admin/dashboard.html` — cari, filter Publish/Draft, lihat, edit, hapus.
- **Baca**: `artikel/baca.html?slug=judul-artikel`.
- Gambar yang di-upload tersimpan di `assets/uploads/`.

### API
| Method | URL | Keterangan |
|---|---|---|
| GET | `/api/articles` | Artikel yang sudah Publish |
| GET | `/api/articles?scope=admin` | Semua artikel (login) |
| GET | `/api/articles/:idAtauSlug` | Satu artikel (draft hanya untuk admin) |
| POST | `/api/articles` | Tambah (login) |
| PUT | `/api/articles/:id` | Edit (login) |
| DELETE | `/api/articles/:id` | Hapus (login) |
| POST | `/api/uploads` | Upload gambar (login) |
