# BUILD_STATUS.md

Status jujur per fitur TNG Daily pada akhir fase MVP ini.

Yang perlu dipahami lebih dulu: repo ini dibangun **tanpa satu pun kredensial**
Supabase, Cloudinary, provider stock photo, atau provider AI. Artinya seluruh
integrasi eksternal terverifikasi sampai batas kontrak, tipe, validasi, dan
penanganan error, tetapi **tidak** terverifikasi terhadap layanan aslinya. Bagian
mana yang mana ditandai eksplisit di bawah.

Terakhir diperbarui: 7 September 2026.

---

## Yang sudah terverifikasi berjalan

Diverifikasi dengan `npm run lint`, `npm run typecheck`, `npm run build`, plus
smoke test HTTP dan screenshot Chromium terhadap dev server yang benar-benar
berjalan.

| Verifikasi | Hasil |
| --- | --- |
| `npm run lint` | lulus, 0 error 0 warning |
| `npm run typecheck` | lulus, TypeScript strict + `noUncheckedIndexedAccess` |
| `npm run test` | tersedia untuk script operasional; jalankan ulang setelah perubahan ops/deploy |
| `npm run build` | lulus, 27 halaman statis dan seluruh route dinamis ter-generate |
| `npm run deploy:check` | tersedia; pada environment lokal saat ini gagal sesuai desain karena env Supabase production dan `NEXT_PUBLIC_SITE_URL` production belum ada |
| `impeccable detect --json src/app src/components` | `[]`, bersih |
| Smoke test HTTP | 13 route publik 200, `/admin` 307 ke login, slug tak dikenal 404 |
| Screenshot | 375, 390, 768, 1440 pada feed, artikel, /hustle, kontribusi, login |
| SSRF guard | 19 kasus diuji langsung, 19 lulus (rincian di bawah) |
| Kebocoran secret di HTML | HTML artikel dicek untuk `service_role`, `SUPABASE_SERVICE_ROLE`, `CLOUDINARY_API_SECRET`, `vault_secret_id`, `sk-`, prefix JWT: nol kecocokan |

### Halaman publik

Berfungsi penuh dengan artikel contoh yang dibundel:

- Feed vertikal di `/` dengan banner per artikel, reaction bar di hem bawah,
  bottom nav di thumb zone, dan CTA kontribusi setelah beberapa artikel.
- Empat halaman pilar: `/vibes`, `/suara`, `/hustle`, `/story`. Masing-masing
  punya hero dalam material pilarnya sendiri, filter tag lewat URL search params,
  dan `/hustle` punya bento noticeboard untuk loker dan UMKM.
- Detail artikel `/artikel/[slug]` dengan metadata SEO server-rendered, JSON-LD
  `NewsArticle` dan `BreadcrumbList`, panel sumber, related articles, dan dock
  reaksi yang muncul setelah pembaca mulai scroll.
- `/kontribusi`, `/tentang`, `/cari`, `/menu`.
- 404, loading skeleton, dan error boundary yang hanya menampilkan digest, bukan
  pesan error server.
- `sitemap.xml` dinamis dan `robots.txt` yang memblokir `/admin` dan `/api`.
- OG image generatif: satu default dan satu per artikel dalam material pilarnya.

### CMS

- Gate `/admin/*` lewat `src/proxy.ts`, plus pemeriksaan role ulang di setiap
  page dan route handler. Middleware tidak diperlakukan sebagai batas otorisasi
  untuk data.
- Editor artikel: autosave debounce 2,5 detik dengan indikator status simpan,
  slug otomatis yang berhenti otomatis begitu editor menyentuhnya, preview yang
  memakai pipeline render dan sanitasi yang sama dengan halaman publik, publish
  dan schedule sebagai aksi terpisah dengan dialog konfirmasi, panel sumber,
  panel SEO, dan peringatan jumlah flag `[BUTUH VERIFIKASI:]` sebelum publish.
- Daftar konten dengan pencarian judul, filter status dan pilar, dan paginasi.
- Moderasi kontribusi: setujui, tolak, kembalikan ke antrean, dan buat draft
  artikel dari kiriman. Menyetujui kiriman tidak menayangkan apa pun.
- Status artikel sebagai tanda, bukan warna: patch Draft, patch Terjadwal dengan
  tanggalnya, stencil Tayang, patch Arsip yang dicoret.

### Keamanan yang diuji

SSRF guard (`src/lib/security/ssrf.ts`) diuji langsung terhadap 19 kasus dan
semuanya lulus:

```text
AWS IMDS 169.254.169.254        blocked (private_address)
metadata.google.internal        blocked (blocked_host)
localhost / 127.0.0.1 / [::1]   blocked
10/8, 172.16/12, 192.168/16     blocked (private_address)
100.64/10 CGNAT                 blocked (private_address)
IPv6 ULA fd00::/8               blocked (private_address)
IPv4-mapped ::ffff:127.0.0.1    blocked (private_address)
file:// dan gopher://           blocked (bad_scheme)
http://user:pass@host/          blocked (has_credentials)
port 8080                       blocked (bad_port)
*.corp dan *.local              blocked (blocked_host)
https://example.com/artikel     allowed
http://example.com/artikel      allowed
```

Selain itu: `/api/rewrite/extract` menolak permintaan tanpa sesi editor dengan
403, terverifikasi lewat request nyata.

---

## Yang lengkap secara kode tetapi belum terverifikasi terhadap layanan asli

Semua di bagian ini punya implementasi penuh, validasi, penanganan error, dan
state UI. Yang belum ada adalah bukti empiris bahwa layanan pihak ketiganya
merespons seperti yang diharapkan.

| Fitur | Kondisi | Yang perlu dilakukan untuk memverifikasi |
| --- | --- | --- |
| Supabase Auth, RLS, seluruh query | Migration 0001..0015 dan empat migration hardening sudah diterapkan ke project live. `supabase db lint` bersih; owner, function grant, trigger, RLS, dan FK index sudah diverifikasi. Seed konten/prompt belum dijalankan. Script `seed:production` sudah tersedia untuk mengisi prompt wajib tanpa konten demo. | Isi `SUPABASE_DB_URL` atau env PG, jalankan `npm run seed:production`, lalu masukkan artikel editorial produksi. |
| Login CMS | Owner `liemsteffy@gmail.com` aktif dan `user.manage_roles`/authority rank sudah diverifikasi melalui database. Full browser login dengan kredensial owner belum diulang pada audit ini. | Login sebagai owner di browser dan cek `/admin`, lalu aktifkan MFA sesuai kebijakan operasional. |
| Upload Cloudinary | Route tanda tangan dan upload langsung dari browser selesai. Belum pernah ada file yang benar-benar terunggah. | Isi kredensial Cloudinary, unggah satu gambar dari editor artikel. |
| Ingest foto stok | Proxy pencarian, guard host per provider, dan ingest ke Cloudinary selesai. | Isi satu key provider, cari, lalu pilih satu foto. |
| Gateway AI | Retry, klasifikasi error, fallback berjenjang, logging, timeout, dan validasi Zod selesai. Belum pernah ada panggilan ke provider asli. | Tambah provider dan key di `/admin/ai`, jalankan Test connection. |
| Content Studio 5 tahap | Wizard, pencatatan job per tahap, version history lewat kolom `revision`, dan regenerate per tahap selesai. | Butuh provider AI aktif. |
| Rewrite Studio | Ekstraksi multi-URL, decision handling, peta atribusi, dan similarity check n-gram selesai. Ekstraksi HTML sendiri belum diuji terhadap situs berita nyata. | Butuh provider AI aktif, plus uji terhadap beberapa situs berita lokal. |
| Supabase Vault | Extension `supabase_vault` aktif di project live. Belum ada provider/key AI untuk menguji round-trip secret. | Set `SECRET_STORE_DRIVER=supabase-vault`, tambah provider dan key, lalu jalankan Test connection. |
| Penjadwalan artikel | Migration `20260907154311_schedule_due_articles_cron.sql` sudah diterapkan ke project live. Extension `pg_cron` aktif dan job `tng-publish-due-articles` aktif setiap 5 menit. | Pantau run history di Supabase Cron setelah ada artikel `scheduled` nyata. |
| Upload kiriman komunitas | Route memeriksa magic bytes dan ukuran, lalu menulis ke bucket `contributions`. Bucket dibuat oleh migration 0006 yang belum dijalankan. | Apply 0006, coba unggah satu gambar dari `/kontribusi`. |

---

## Yang sengaja tidak dibangun

Diminta ditunda ke fase 2 oleh instruksi implementasi. Struktur data dan modulnya
sudah disiapkan supaya penambahannya tidak butuh migrasi besar.

- Komentar publik di artikel.
- Personalisasi feed berbasis perilaku pembaca.
- Pembayaran untuk listing direktori. Kolom `directory_listings.is_paid` sudah
  ada, tetapi tidak ada integrasi pembayaran.
- Push notification.
- Editor Copilot sebagai UI chat. Prompt `tng-editor-copilot-v1` sudah di-seed
  dan gateway-nya siap, tetapi belum ada halaman chat-nya.
- Halaman manajemen user di dalam dashboard. Perubahan role sengaja hanya lewat
  SQL, karena elevasi role dari UI adalah jalur penyalahgunaan yang paling umum.
- Editor prompt template di dalam dashboard. Template bisa dibaca dan statusnya
  terlihat di `/admin/ai`, tetapi pengeditannya lewat SQL. Tabel dan policy-nya
  sudah siap untuk UI edit nanti.

---

## Keputusan yang menyimpang dari brief

Empat penyimpangan, semuanya disengaja.

1. **Font.** Brief menyebut `Space Grotesk` + `Inter` sebagai contoh. Diganti ke
   `Bricolage Grotesque` + `Manrope` setelah dikonfirmasi ke user. Space Grotesk
   adalah display face yang paling sering dipakai untuk dark neo-brutalism,
   sehingga identitasnya mudah tertukar. Bricolage punya axis lebar, jadi
   headline bisa benar-benar condensed, bukan hasil transform.

2. **`framer-motion` dan `embla-carousel-react` tidak dipasang.** Brief
   menyebutnya sebagai rekomendasi opsional. Motion di produk ini hanya butuh
   dua keyframe CSS dan beberapa transition, dan feed wajib native-scroll-first.
   Memasang dua library ini akan menambah bundle tanpa manfaat yang terpakai.

3. **`TanStack Query` dan `nuqs` tidak dipasang.** Brief menyebut TanStack Query
   hanya untuk state client yang memang perlu; di MVP ini tidak ada. Filter
   artikel memakai search params yang diparsing di Server Component, sehingga
   `nuqs` dan provider client-nya tidak diperlukan.

4. **`src/middleware.ts` menjadi `src/proxy.ts`.** Next.js 16 mendeprecate
   konvensi `middleware` dan memperingatkan di setiap build. Isi dan matcher-nya
   identik.

Selain itu, satu tambahan di luar brief: `ESLint` dipin ke 9.39.5, bukan 10.x.
`eslint-plugin-react` yang dibawa `eslint-config-next@16` belum kompatibel dengan
ESLint 10 dan membuat lint gagal dengan error internal.

---

## Konfigurasi manual yang masih harus dilakukan

Urutan yang disarankan:

1. Buat project Supabase, isi tiga env Supabase di `.env.local` atau Vercel.
2. Apply seluruh migration di `supabase/migrations` secara berurutan.
3. Jalankan `npm run deploy:check`; lanjutkan hanya setelah semua item wajib lulus.
4. Jalankan `npm run seed:production`, lalu masukkan artikel editorial produksi. Jangan memasukkan artikel contoh ke production tanpa keputusan editorial.
5. Buat user pertama di dashboard Supabase, lalu bootstrap owner melalui authenticated RPC sesuai `docs/OWNER_BOOTSTRAP.md`.
6. Isi kredensial Cloudinary.
7. Isi minimal satu key stock photo.
8. Aktifkan extension `supabase_vault`, set `SECRET_STORE_DRIVER=supabase-vault`.
9. Tambah provider AI dan API key di `/admin/ai`, jalankan Test connection.
10. Verifikasi scheduler `tng_publish_due_articles()` aktif di Supabase Cron.
11. Set `NEXT_PUBLIC_SITE_URL` ke domain produksi sebelum deploy.

Langkah 1 sampai 4 wajib supaya CMS bisa dipakai. Langkah 5 sampai 8 wajib supaya
pipeline gambar dan AI bisa dipakai. Langkah 9 sampai 11 wajib sebelum produksi.

Setelah semuanya terisi, `/admin/settings` akan menampilkan status setiap
integrasi sebagai daftar Siap atau Belum. Halaman itu tidak pernah menampilkan
nilai kredensial apa pun.
