# BUILD_STATUS.md

Status jujur per fitur TNG Daily pada akhir fase MVP ini.

Yang perlu dipahami lebih dulu: repo ini dibangun **tanpa satu pun kredensial**
Supabase, Cloudinary, provider stock photo, atau provider AI. Artinya seluruh
integrasi eksternal terverifikasi sampai batas kontrak, tipe, validasi, dan
penanganan error, tetapi **tidak** terverifikasi terhadap layanan aslinya. Bagian
mana yang mana ditandai eksplisit di bawah.

Terakhir diperbarui: 9 September 2026 (verifikasi integrasi end-to-end + perbaikan).

---

## Yang sudah terverifikasi berjalan

Diverifikasi dengan `npm run lint`, `npm run typecheck`, `npm run build`, plus
smoke test HTTP dan screenshot Chromium terhadap dev server yang benar-benar
berjalan.

| Verifikasi | Hasil |
| --- | --- |
| `npm run lint` | lulus, 0 error 0 warning (9 Sep 2026: `.kilo/**`, `.codex/**`, `.playwright-cli/**` di-ignore sebagai tooling vendored; `any` + unused var di `src/lib/ai/extract.ts` diperbaiki dengan `parseJinaPayload` + narrowing) |
| `npm run typecheck` | lulus, TypeScript strict + `noUncheckedIndexedAccess` |
| `npm run test` | 32/32 lulus (9 Sep 2026): 3 ops eksisting + 1 gateway-mock eksisting + 28 baru — klasifikasi fallback AI (9), SSRF guard (9), taksonomi/label (6), deploy-readiness (4). Loader `tests/helpers/require-server.mjs` dipakai bersama untuk mengeksekusi source TS server-side di plain Node |
| `npm run build` | lulus, 27 halaman statis dan seluruh route dinamis ter-generate |
| `npm run deploy:check` | lulus dengan 0 peringatan pada 9 Sep 2026 (sebelumnya 1 WARN Cloudinary palsu, diperbaiki: script kini menerima fallback `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_FOLDER` seperti `src/lib/env.ts`) |
| RLS `articles` | **diperbaiki 9 Sep 2026**: RLS sempat nonaktif sehingga anon bisa membaca draft via PostgREST langsung; migration `0018_enable_articles_rls_repair.sql` mengaktifkannya kembali dan anon kini hanya melihat artikel published |
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
| Supabase Auth, RLS, seluruh query | **Terverifikasi live 9 Sep 2026.** Migration 0001..0018 diterapkan. `seed:production:check` lulus (11 prompt template aktif). 1 auth user dengan role Owner. Anon PostgREST hanya membaca artikel published (draft bocor sebelum fix 0018, kini tertutup). | Tambah artikel editorial produksi; hanya pilar `vibes` yang punya konten, pilar lain masih kosong. |
| Login CMS | Owner `liemsteffy` (1 auth user, role Owner) terverifikasi di database. Full browser login dengan kredensial owner belum diulang pada audit ini. | Login sebagai owner di browser dan cek `/admin`, lalu aktifkan MFA sesuai kebijakan operasional. |
| Upload Cloudinary | **Terverifikasi live 9 Sep 2026.** 4 baris `article_images` (sumber Pexels) menunjuk ke delivery URL Cloudinary yang merespons HTTP 200 `image/webp`. Signed-upload dari browser belum diuji klik-per-klik. | Di editor artikel, unggah satu gambar langsung dari browser untuk menutup verifikasi signed upload. |
| Ingest foto stok | **Terverifikasi live 9 Sep 2026.** Unsplash (HTTP 200, kuota 49 tersisa) dan Pexels (HTTP 200) merespons dengan key yang ada. Pixabay belum punya key (opsional). 4 gambar Pexels sudah ter-ingest ke Cloudinary. | Tambah `PIXABAY_API_KEY` bila ingin 3 provider aktif; tidak wajib. |
| Gateway AI | **Terverifikasi live 9 Sep 2026.** Provider TokenRouter + 1 key aktif; 9 dari 10 panggilan `rewrite` terakhir sukses (latensi 75–179 dtk, model gratis `z-ai/glm-5.3-free`). Kegagalan yang ada berbentuk output non-JSON dari model gratis, ditangani aman oleh gateway (job `failed` + pesan aman). | Tambah provider/key fallback berbayar agar tidak single-point-of-failure; model gratis lambat dan sering gagal validasi schema. Routing per-task (`ai_task_models`) masih kosong — gateway memakai rantai prioritas generik. |
| Content Studio 5 tahap | Wizard, pencatatan job per tahap, version history lewat kolom `revision`, dan regenerate per tahap selesai. Gateway AI sudah live (lihat di atas). | Uji wizard penuh di browser dengan brief nyata. |
| Rewrite Studio | Ekstraksi multi-URL, decision handling, peta atribusi, dan similarity check n-gram selesai. **Reaper aktif 9 Sep 2026**: migration `0019_stale_rewrite_job_reaper.sql` (fungsi `tng_fail_stale_rewrite_jobs()` + cron per jam `tng-fail-stale-rewrite-jobs`) otomatis menggagalkan ekstraksi basi >24 jam tanpa menghapus `extracted_content`; baris basi lama sudah dibersihkan. 1 ekstraksi gagal terhadap situs berita lokal (`berita.tangerangselatankota.go.id`: tidak ada URL berhasil diekstrak). | Uji ekstraksi ke beberapa situs berita lokal lain. |
| Supabase Vault | **Terverifikasi live 9 Sep 2026.** Extension aktif, RPC `tng_vault_{create,read,delete}_secret` ada, dan keberhasilan panggilan gateway membuktikan round-trip read secret berjalan. | Tidak ada aksi tersisa. |
| Penjadwalan artikel | Migration cron sudah diterapkan. Extension `pg_cron` aktif dan job `tng-publish-due-articles` aktif setiap 5 menit. | Pantau run history di Supabase Cron setelah ada artikel `scheduled` nyata. |
| Upload kiriman komunitas | Bucket `contributions` (public, batas 5 MB, MIME gambar) sudah ada dari migration 0006. Belum ada objek terunggah (0 objects); antrean moderasi kosong (3 approved, 0 pending). | Coba unggah satu gambar dari `/kontribusi` untuk menutup verifikasi upload. |

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
