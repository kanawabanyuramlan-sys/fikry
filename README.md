# VERDA — Premium Multi-Brand Lifestyle & Fashion Store

Platform e-commerce multi-brand lengkap: storefront premium, katalog dinamis, keranjang & checkout,
pelacakan pesanan, dashboard admin, dan **manajemen tim multi-user** (Owner, Manager, staff, custom role)
yang bekerja di **satu database** yang sama.

> Nama brand "VERDA", logo, dan identitas visual adalah orisinal. Brand produk di seed (Northpeak, Kinetik,
> Urban Kite, dst.) adalah **data demo fiktif**. Fotonya adalah **foto contoh berlisensi** (lihat bawah) — ganti dengan
> brand & foto produk asli yang Anda jual.

## Stack

| Layer | Teknologi |
| --- | --- |
| Frontend | Next.js 15 (App Router, React 19, Server Components) |
| Styling | Tailwind CSS 3, design token hijau (`tailwind.config.ts`), Plus Jakarta Sans |
| Backend | Next.js Server Actions + Route Handlers (`src/app/actions`, `src/app/admin/actions`, `src/app/api`) |
| Database | Prisma ORM + PostgreSQL (Neon free tier, atau Supabase) |
| Auth | Sesi JWT (HS256, `jose`) di cookie httpOnly, password `bcrypt` (cost 12), revokasi sesi via `sessionVersion` |
| Storage | Netlify Blobs saat di Netlify, disk lokal `storage/uploads` saat develop — selalu disajikan via `/media/*` |
| Email | SMTP via `nodemailer` (opsional) |

## Menjalankan

```bash
npm install
cp .env.example .env        # isi AUTH_SECRET (32+ karakter acak) dan password Owner awal
npx prisma db push          # buat skema database
npm run db:seed             # permission, role, akun Owner, kategori, produk demo, promo
npm run dev                 # http://localhost:3000
```

- Toko: `http://localhost:3000`
- Dashboard tim: `http://localhost:3000/admin` — login dengan `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` dari `.env`.
  **Ganti password Owner** di *My Account* setelah login pertama.
- Reset database dev ke kondisi awal: `npm run db:reset` (menghapus semua data).

Produksi: `npm run build && npm start`.

### Deploy gratis: GitHub → Netlify + Neon

1. **Upload kode ke repo GitHub** (git push, atau upload lewat web GitHub).
2. **Database (Neon, gratis):** buat project di neon.tech → *Connect* → salin dua connection string:
   **pooled** (host mengandung `-pooler`) dan **direct** (tanpa `-pooler`).
3. **Netlify → Add new site → Import an existing project → GitHub →** pilih repo. Pengaturan build sudah ada di `netlify.toml`.
4. **Site configuration → Environment variables:**
   - `DATABASE_URL` = connection string *pooled* · `DATABASE_URL_UNPOOLED` = connection string *direct*
   - `AUTH_SECRET` = 32+ karakter acak · `APP_URL` = alamat situs, mis. `https://nama-situs.netlify.app`
   - `SEED_OWNER_EMAIL`, `SEED_OWNER_NAME`, `SEED_OWNER_PASSWORD` (min. 10 karakter) — akun Owner pertama
   - Opsional `SMTP_*` untuk email undangan tim.
5. **Deploys → Trigger deploy.** Perintah `npm run build:deploy` membuat tabel (`prisma db push`), menjalankan seed
   (permission, role, Owner, kategori, produk demo, promo — aman diulang) lalu `next build`.
6. Buka `/admin`, login sebagai Owner, **ganti password** di *My Account*.

Upload foto produk tersimpan di Netlify Blobs (otomatis, tanpa konfigurasi). Foto dikompres di browser (maks 1600 px) agar muat batas request serverless.
Untuk develop lokal, isi `DATABASE_URL` + `DATABASE_URL_UNPOOLED` di `.env` dengan database Postgres (mis. branch `dev` di Neon).

## Fitur utama

**Storefront**
- Announcement bar, sticky navbar, mega menu (kategori dinamis dari database), search, akun, wishlist, mini-cart.
- Homepage: hero carousel, Shop by Category, Shop by Brand, New Arrivals, Best Sellers (dihitung dari unit terjual nyata,
  ditambah pilihan manual saat data penjualan masih sedikit), Trending, banner promo, newsletter, footer lengkap.
- Katalog: filter kategori/tipe, brand, harga, warna, ukuran, ketersediaan, diskon, gender — facet menyesuaikan kategori
  yang dibuka. Sorting terbaru, terpopuler, harga naik/turun. Pagination.
- Product detail: galeri multi-foto + zoom & lightbox, pilih warna/ukuran **wajib** sebelum add to cart, stok per varian,
  spesifikasi & atribut kustom, info pengiriman/garansi/retur, ulasan (moderasi), produk terkait, JSON-LD.
- Quick View, wishlist (lokal untuk tamu, tersimpan di akun saat login).
- Keranjang & checkout 2 langkah (data → ringkasan → konfirmasi). Harga, stok, voucher, ongkir **dihitung ulang di server**;
  stok dikunci atomik saat order dibuat.
- Konfirmasi pesanan: Order ID, ringkasan, info transfer bank, tombol konfirmasi WhatsApp. Checkout via WhatsApp sebagai alternatif.
- Lacak pesanan (Order ID + email/WA), akun pelanggan (profil, alamat, riwayat pesanan), retur/komplain dengan upload foto.
- Halaman kebijakan (about, shipping, warranty, return, exchange, refund, authenticity, quality, privacy, terms) — semua diedit dari admin.
- Floating WhatsApp button dengan pesan otomatis, popup promo (maks. sekali per 3 hari).
- SEO: metadata per halaman, Open Graph, canonical, `sitemap.xml`, `robots.txt`, structured data Product.

**Dashboard admin (`/admin`)**
- Overview: revenue (pesanan lunas), total order/produk/pelanggan, produk aktif, pesanan pending, stok menipis,
  grafik penjualan 30 hari dari data nyata, pesanan & aktivitas terbaru.
- Products: tambah/edit/hapus, multi-upload foto, varian (generator warna × ukuran), harga & diskon, atribut kustom,
  SEO, flag New/Featured/Best Seller, ilustrasi cadangan berlabel.
- Product approval: Draft → Pending Approval → Approved → Published → Archived, tombol Approve/Reject/Request Revision/Publish
  dengan catatan. Owner memilih di *Settings* apakah produk staff perlu approval.
- Categories (pohon kategori tak terbatas + template atribut), Brands, Inventory (stok per varian + ledger pergerakan stok).
- Orders & Shipping: status Order Received → Confirmed → Processing → Packed → Shipped → Delivered / Cancelled (cancel
  mengembalikan stok), kurir, nomor resi, ongkir, estimasi tiba, catatan, status pembayaran manual.
- Customers, Reviews, Returns & Complaints, Promotions & Ads (dijadwalkan otomatis by tanggal), Vouchers, Website Settings.

**Team Management**
- Invite member via email (token acak sekali pakai, di-hash di database, kedaluwarsa 72 jam). Jika SMTP belum diatur,
  tautan undangan ditampilkan untuk dibagikan manual — sistem tidak berpura-pura email terkirim.
- Create account langsung, edit, assign role, suspend (langsung mengeluarkan semua sesi), remove (soft — riwayat tetap),
  reset password, lihat aktivitas per anggota, transfer kepemilikan (khusus Owner).
- Role bawaan: Owner, Manager, Product Staff, Inventory Staff, Order & Shipping Staff, Marketing Staff + **custom role**
  dengan matriks permission.
- **Permission dicek di server** untuk setiap halaman & server action (`requireStaffPage`, `staffAction`). Menu yang tidak
  diizinkan disembunyikan, tetapi itu bukan satu-satunya proteksi. Non-owner tidak dapat memberi role berizin melebihi miliknya.
- Activity Logs: siapa menambah/mengedit produk, mengubah harga, stok, status & pengiriman pesanan, akses tim — dengan waktu.

### Alur kolaborasi (contoh: Pikry)
1. Owner → *Team Management* → isi email Pikry, pilih role **Product Staff** → *Send invite*.
2. Pikry membuka tautan undangan → isi nama & password → akun aktif dan langsung masuk dashboard.
3. Pikry hanya melihat menu Products, Inventory, Categories, Brands → *Add Product* → isi data, varian, foto.
4. Produk masuk database utama dengan status *Pending Approval* (jika approval aktif) dan tidak tampil di toko.
5. Owner melihat notifikasi approval → Approve / Request Revision (dengan catatan) / Reject / Publish.
6. Semua perubahan tercatat di Activity Logs dan langsung terlihat oleh anggota lain.

## Sistem desain & foto

- Sistem desain terkunci di [`design.md`](design.md): palet **Linen & Moss** (token OKLCH di `src/app/tokens.css`), judul serif Instrument Serif (tegak), body Plus Jakarta Sans, ikon **Phosphor** lewat `src/components/icons.tsx`.
- Foto demo: foto bebas lisensi dari Unsplash di `public/samples/` (kredit fotografer di `public/samples/CREDITS.json`). Disimpan dengan `ProductImage.isSample = true` dan selalu diberi label **"Foto contoh"**. Foto yang menampilkan logo brand pihak ketiga sudah disaring.
- Saat tim mengunggah foto asli di admin, foto itu otomatis jadi foto utama; `npx tsx prisma/apply-sample-photos.ts` tidak menimpa produk yang sudah punya foto asli.
- Produk tanpa foto sama sekali menampilkan panel netral "Foto segera hadir" (bukan ilustrasi).

## Pembayaran
Belum ada payment gateway. Checkout membuat pesanan berstatus *Belum dibayar* dan menampilkan instruksi transfer
dari *Settings*; tim menandai *Lunas* setelah verifikasi manual. Tidak ada transaksi pembayaran yang disimulasikan.
Integrasi gateway (Midtrans/Xendit) dapat ditambahkan di atas `placeOrder` (`src/app/actions/store.ts`) dengan webhook
yang memperbarui `paymentStatus`.

## Keamanan
- Password bcrypt, sesi JWT httpOnly + SameSite=Lax (+ Secure di produksi), sesi diverifikasi ke DB setiap request.
- Rate limit login staff/pelanggan, tracking, registrasi, newsletter, checkout (in-memory per proses — gunakan Redis bila multi-instance).
- Upload: hanya JPG/PNG/WEBP/AVIF/GIF, dicek magic bytes, maks 8 MB, nama file acak; SVG ditolak.
- Server Actions memiliki proteksi origin bawaan Next.js; header keamanan dasar di `next.config.ts`.
- Tidak ada secret yang diekspos ke frontend; semua kredensial melalui environment variables.
- Pendaftaran publik hanya untuk pelanggan. Akun tim hanya lewat undangan/akun dari Owner.

## Struktur
```
prisma/schema.prisma         skema database (users, roles, permissions, invitations, products, variants, …)
prisma/seed.ts               data awal
src/lib/                     auth, permission guard, catalog query, pricing, storage, settings
src/app/(store)/             storefront
src/app/admin/(panel)/       dashboard tim
src/app/admin/actions/       server actions admin (semuanya melewati staffAction + permission)
src/components/              UI (store, admin, ilustrasi produk SVG)
```
