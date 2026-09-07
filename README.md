# TNG Daily

Media digital untuk anak muda Tangerang Raya: Kota Tangerang, Tangerang Selatan,
dan Kabupaten Tangerang. Repo ini berisi situs publik, CMS kustom, dan AI Content
Engine dalam satu aplikasi Next.js.

Dokumen produk ada di `docs/`:
`TNG_Daily_PRD.md`, `TNG_Daily_CMS_AI_PRD.md`, dan `TNG_Daily_AI_System_Prompts.md`.
Rencana teknis ada di `IMPLEMENTATION_PLAN.md`. Status per fitur, termasuk yang
belum bisa diverifikasi tanpa kredensial, ada di `BUILD_STATUS.md`.

---

## Stack

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, Server Components sebagai default |
| Bahasa | TypeScript 5.9 strict, `noUncheckedIndexedAccess` aktif |
| Styling | Tailwind CSS 4 (CSS-first `@theme`), token di `src/app/globals.css` |
| Primitives | Radix UI + pola shadcn/ui, ditulis manual di `src/components/ui` |
| Database | Supabase Postgres + Auth + RLS, SQL migration manual tanpa ORM |
| Media | Cloudinary (signed upload) + Supabase Storage untuk kiriman anonim |
| AI | Gateway OpenAI-compatible dengan fallback berjenjang, Zod untuk semua output |
| Deploy | Vercel |

---

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # boleh dibiarkan kosong dulu
npm run dev
```

Tanpa kredensial apa pun, situs publik langsung jalan memakai 11 artikel contoh
yang dibundel (`src/lib/data/demo/`). Artikel contoh selalu diberi patch
**Contoh** di feed dan di halaman artikel, dan mode ini otomatis mati di
production. Halaman admin dan AI menampilkan state konfigurasi yang menyebut
environment variable yang belum ada, bukan halaman kosong.

Perintah lain:

```bash
npm run lint        # eslint, 0 warning ditoleransi
npm run typecheck   # tsc --noEmit
npm run test        # Node test runner untuk script operasional
npm run build       # production build
npm run deploy:check  # cek env/repo wajib sebelum deploy
npm run seed:articles  # regenerate supabase/seed_articles.sql dari modul demo
npm run seed:production  # apply prompt AI wajib tanpa konten demo
```

---

## Setup Supabase

### 1. Buat project dan isi env

Buat project di [supabase.com](https://supabase.com), lalu dari
**Project Settings → API** salin ke `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # publishable/anon key
SUPABASE_SERVICE_ROLE_KEY=...          # server only, jangan pernah pakai prefix NEXT_PUBLIC_
```

`SUPABASE_SERVICE_ROLE_KEY` mem-bypass RLS. Kunci ini hanya dibaca di
`src/lib/env.ts`, yang mengimpor `server-only`, sehingga impor dari Client
Component akan gagal saat build, bukan diam-diam bocor.

### 2. Apply migration

Lewat **SQL Editor** di dashboard Supabase, jalankan berurutan:

```text
supabase/migrations/0001_init.sql        enum, extension, helper
supabase/migrations/0002_content.sql     profiles, articles, sources, images, reactions, contributions, directory
supabase/migrations/0003_ai.sql          providers, api keys, usage log, prompt templates, jobs, rewrite jobs
supabase/migrations/0004_functions.sql   trigger, counter, wrapper Vault
supabase/migrations/0005_rls.sql         RLS di 13 tabel
supabase/migrations/0006_storage.sql     bucket kiriman komunitas
```

Atau dengan Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### 3. Seed prompt production

Untuk production, jalankan hanya seed prompt system:

```bash
npm run seed:production
npm run seed:production:check
```

Script ini membaca hanya bagian `ai_prompt_templates` dari
`supabase/seed.sql`, lalu menolak eksekusi jika ekstraksi mengandung
kontribusi, listing, atau artikel demo. Isi `SUPABASE_DB_URL` atau
`PGHOST`/`PGUSER`/`PGPASSWORD` terlebih dahulu.

`supabase/seed.sql` lengkap dan `supabase/seed_articles.sql` tetap tersedia
untuk staging/demo. Jangan menjalankannya ke production tanpa keputusan
editorial karena berisi kontribusi, listing, dan artikel contoh. Tanpa prompt
template, sistem AI memakai salinan file fallback di repo dan halaman
Konfigurasi AI akan memberi tahu bahwa seed belum lengkap.

### 4. Membuat admin pertama

Tidak ada pendaftaran publik. Buat user lewat
**Authentication → Users → Add user** di dashboard Supabase, isi email dan
password, dan aktifkan *Auto Confirm User*.

Trigger `on_auth_user_created` otomatis membuat baris `profiles` dengan status
aktif. Role disimpan di `public.user_roles`, bukan lagi di `profiles.role`.

Untuk user pertama, login sebagai user tersebut lalu panggil
`public.tng_bootstrap_authenticated_first_owner()` melalui authenticated
Supabase client. RPC ini hanya dapat menjadikan `auth.uid()` sendiri sebagai
owner dan hanya berhasil ketika belum ada active owner. SQL Editor biasa tidak
merepresentasikan sesi user karena `auth.uid()` bernilai null. Detail dan jalur
break-glass ada di [docs/OWNER_BOOTSTRAP.md](docs/OWNER_BOOTSTRAP.md).

Setelah owner tersedia, perubahan role dilakukan melalui
`tng_assign_role`, `tng_update_role_expiry`, dan `tng_revoke_role`. Direct
`INSERT`/`UPDATE`/`DELETE` pada `public.user_roles` tetap dilarang. Editor bisa
CRUD artikel, moderasi kontribusi, dan memakai kedua studio AI. Hanya owner
yang dapat mengatur provider AI, API key, prompt template, dan role.

### 5. Menjadwalkan artikel terjadwal

Artikel berstatus `scheduled` tayang lewat fungsi
`public.tng_publish_due_articles()`. Migration
`20260907154311_schedule_due_articles_cron.sql` mengaktifkan Supabase Cron
dan menjadwalkannya setiap lima menit:

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'tng-publish-due-articles',
  '*/5 * * * *',
  $$select public.tng_publish_due_articles();$$
);
```

Kalau migration ini belum diterapkan di environment tertentu, artikel terjadwal
tetap tersimpan tapi tidak tayang otomatis.

---

## Setup Cloudinary

Cloudinary menangani gambar editorial: upload dari perangkat editor, ingest foto
stok, dan delivery. Dari dashboard Cloudinary, isi:

```bash
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=      # server only
CLOUDINARY_UPLOAD_FOLDER=tngdaily
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=   # opsional, hanya untuk membangun URL delivery
```

Cara kerjanya: browser meminta tanda tangan ke `/api/images/sign`, lalu
mengunggah langsung ke Cloudinary. API secret dipakai untuk menandatangani di
server dan tidak pernah dikirim ke browser. File tidak melewati server kita.

Kiriman gambar dari pembaca anonim tidak memakai Cloudinary. Kiriman itu masuk ke
bucket Supabase Storage `contributions` lewat `/api/contributions/upload`, yang
memeriksa ukuran dan magic bytes file, bukan hanya MIME type yang dikirim client.

---

## Setup stock photo di Vercel

Key provider hanya dibaca di server dan diproksikan lewat `/api/images/search`.
Tambahkan di **Vercel → Project → Settings → Environment Variables**, tanpa
prefix `NEXT_PUBLIC_`:

```bash
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

Cukup satu provider untuk mengaktifkan tab pencarian gambar. Catatan kuota:
Unsplash demo mode dibatasi 50 request per jam, Pexels jauh lebih longgar untuk
pemakaian harian. Kuota sisa ditampilkan di picker bila provider mengirimkannya.

Setiap gambar stok wajib membawa atribusi. Constraint
`article_images_stock_needs_credit` di database menolak baris gambar non-upload
tanpa `attribution_text`, jadi kredit fotografer tidak bisa hilang karena lupa.

---

## Supabase Vault dan SecretStore production

API key provider AI tidak pernah disimpan plaintext. Penyimpanannya lewat
abstraksi `SecretStore` di `src/lib/ai/secrets.ts`, dengan dua adapter.

### Production: Supabase Vault

1. Aktifkan extension. Di dashboard: **Database → Extensions**, cari
   `supabase_vault`, aktifkan. Atau lewat SQL:

   ```sql
   create extension if not exists supabase_vault with schema vault;
   ```

2. Set environment variable:

   ```bash
   SECRET_STORE_DRIVER=supabase-vault
   ```

   Di production nilai ini sebenarnya tidak wajib: `getSecretStore()` selalu
   memilih Vault ketika `NODE_ENV === 'production'`, sehingga nilai development
   yang tertinggal tidak bisa menurunkan keamanan environment yang sudah live.

3. Verifikasi. Buka `/admin/ai`. Panel **Secret store** harus menunjukkan
   "Supabase Vault". Kalau menunjukkan pesan error, extension belum aktif.

Vault diakses hanya lewat tiga fungsi `SECURITY DEFINER` di migration 0004:
`tng_vault_create_secret`, `tng_vault_read_secret`, `tng_vault_delete_secret`.
Ketiganya sudah di-`revoke` dari role `anon` dan `authenticated`, jadi sesi
browser dengan JWT valid pun tidak bisa memanggilnya.

### Development: adapter terenkripsi lokal

Project Supabase baru tidak selalu punya Vault aktif. Untuk development:

```bash
SECRET_STORE_DRIVER=development
SECRET_STORE_DEV_KEY=<32 byte base64>
```

Generate kuncinya:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Adapter ini menyimpan key ter-enkripsi AES-256-GCM di `.secrets/ai-keys.json`
(sudah masuk `.gitignore`, mode file 0600). Adapter ini menolak dipakai di
production. Tidak ada fallback plaintext di mana pun.

### Menambahkan provider AI

Di `/admin/ai` sebagai admin:

1. **Tambah provider**: nama bebas, base URL endpoint OpenAI-compatible
   (biasanya berakhir `/v1`), dan nama model default.
2. **Tambah key**: ditempel sekali. Setelah disimpan, yang terlihat hanya
   preview ter-mask seperti `sk-...aB3f`. Nilai aslinya tidak bisa dibaca lagi
   dari dashboard.
3. **Atur urutan fallback** dengan tombol naik/turun, lalu simpan.
4. **Test connection** per key untuk memastikan endpoint dan model benar.

Perilaku gateway: mencoba key sesuai prioritas, maksimal empat kandidat per
permintaan. Error konfigurasi (401, 403, 400, 404) menandai key `error` dan
langsung pindah tanpa retry. Error sementara (429, 408, 5xx, timeout, network)
dicoba ulang maksimal dua kali dengan exponential backoff plus jitter sebelum
pindah. Timeout per permintaan 60 detik. Log menyimpan metadata saja: task,
provider, model, status, latensi, dan token. Prompt dan respons tidak disimpan.

---

## Deploy ke Vercel

1. Push repo ke GitHub, lalu **New Project** di Vercel dan pilih repo ini.
   Framework terdeteksi otomatis sebagai Next.js; build command dan output
   directory tidak perlu diubah.

2. Isi environment variable untuk Production dan Preview:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_SITE_URL=https://tngdaily.com
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
   UNSPLASH_ACCESS_KEY=
   PEXELS_API_KEY=
   PIXABAY_API_KEY=
   SECRET_STORE_DRIVER=supabase-vault
   ```

   `NEXT_PUBLIC_SITE_URL` dipakai untuk canonical URL, sitemap, Open Graph, dan
   JSON-LD. Isi dengan domain produksi, tanpa trailing slash. Salah isi di sini
   berarti canonical menunjuk ke domain yang salah.

   Jangan set `DEMO_CONTENT` di production. Artikel contoh otomatis mati di
   production, tapi lebih baik variabelnya tidak ada sama sekali.

3. Tambahkan domain di **Settings → Domains**, lalu arahkan DNS sesuai instruksi
   Vercel.

4. Setelah deploy pertama, buka `/admin/settings` sebagai editor untuk memeriksa
   status setiap integrasi. Halaman itu hanya melaporkan ada atau tidak adanya
   sebuah kredensial, tidak pernah menampilkan nilainya.

Sebelum deploy, jalankan:

```bash
npm run deploy:check
```

Command ini hanya melaporkan `PASS`/`FAIL`/`WARN` untuk env dan repo. Nilai
secret tidak pernah dicetak. `FAIL` berarti deploy belum layak dilanjutkan;
`WARN` berarti deploy bisa jalan, tetapi fitur terkait belum lengkap.

Catatan runtime: route yang memakai `jsdom` (`/api/rewrite/extract`) dan `crypto`
berjalan di Node runtime, bukan Edge. Ini sudah dideklarasikan per route, jadi
tidak ada konfigurasi tambahan di Vercel.

---

## Struktur

```text
src/
  app/
    (public)/          feed, empat pilar, artikel, kontribusi, tentang, cari, menu
    (admin)/admin/     login, dashboard, konten, kontribusi, AI studio, settings
    api/               reactions, contributions, images, ai, rewrite
    sitemap.ts robots.ts opengraph-image.tsx
  components/
    public/ admin/ ai/ editor/ shared/ ui/
  lib/
    supabase/          client, server, proxy session
    ai/                gateway, fallback, secrets, prompts, schemas, tasks, extract, json
    data/              articles, admin, ai, directory, mappers, demo
    security/          ssrf, rate-limit, session
    cloudinary.ts content.ts seo.ts env.ts validation.ts labels.ts
  types/               domain.ts database.ts
  proxy.ts             gate /admin + refresh sesi Supabase
supabase/
  migrations/          0001..0006
  seed.sql             prompt template, kontribusi demo, listing demo
  seed_articles.sql    artikel demo (generated)
scripts/
  generate-seed-articles.mjs
  deploy-readiness.mjs
  seed-production.mjs
```

---

## Catatan keamanan

- Semua permintaan AI berjalan di server route atau Server Action. Browser tidak
  pernah menerima API key, referensi Vault, atau service role key.
- `ai_api_keys` tidak punya policy RLS untuk `anon` maupun `authenticated`, dan
  kolom `vault_secret_id` sudah di-`revoke` dari kedua role. UI admin membacanya
  lewat server route yang hanya mengembalikan metadata dan preview ter-mask.
- Output AI selalu divalidasi Zod sebelum dipakai. Artikel hasil AI dibuat
  sebagai `draft` atau `needs_review`, tidak pernah langsung tayang.
- Rewrite Studio menolak URL non-http(s), URL dengan kredensial, port di luar 80
  dan 443, serta host yang resolve ke alamat privat, loopback, link-local, CGNAT,
  atau reserved di IPv4 maupun IPv6. Redirect diikuti manual maksimal tiga hop
  dengan validasi ulang di setiap hop. Batas respons 2 MB, timeout 12 detik,
  user agent jujur. Paywall, login, dan proteksi anti-bot dilaporkan sebagai
  kegagalan, tidak diakali.
- Markdown disanitasi di server sebelum dirender, dengan allowlist tag yang
  sempit. Flag `[BUTUH VERIFIKASI: ...]` dari penulis AI dirender sebagai
  highlight merah supaya tidak bisa lolos ke publish tanpa terlihat.
- Kiriman komunitas tidak punya policy insert publik. Semuanya lewat
  `/api/contributions` dengan validasi Zod, rate limit memori per instance, dan
  hitungan kedua di database berdasarkan hash pengirim yang di-salt.
