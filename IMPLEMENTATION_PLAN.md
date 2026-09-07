# IMPLEMENTATION_PLAN.md — TNG Daily

Status dokumen: rencana implementasi teknis fase MVP.
Sumber kebenaran produk: `docs/TNG_Daily_PRD.md`, `docs/TNG_Daily_CMS_AI_PRD.md`, `docs/TNG_Daily_AI_System_Prompts.md` (tidak diubah).

Prioritas konflik: (1) keamanan & correctness, (2) CMS/AI PRD, (3) AI System Prompts, (4) PRD utama, (5) instruksi implementasi.

---

## 1. Keputusan teknis

| Area | Keputusan | Alasan |
| --- | --- | --- |
| Framework | Next.js 16.3.x App Router, React 19.2 | versi stabil terbaru saat build |
| Bahasa | TypeScript 5.9.3, `strict: true` + `noUncheckedIndexedAccess` | TS 7.x baru rilis dan belum matang di ekosistem `@types` + eslint plugin |
| Styling | Tailwind CSS 4.3 (`@tailwindcss/postcss`, CSS-first `@theme`) | tidak perlu `tailwind.config.js`, token hidup di satu file CSS |
| Primitives | Radix UI + pola shadcn/ui (`cva` + `cn`) ditulis manual di `src/components/ui` | CLI shadcn menimpa styling; visual world spanduk butuh kontrol penuh |
| Database | Supabase Postgres + Auth + RLS, SQL migration manual | tanpa ORM sesuai instruksi |
| Media | Cloudinary (signed upload dari browser, ingest stock via server) | secret tidak pernah ke client |
| Markdown | `marked` + `sanitize-html` di server | render aman, tanpa `dangerouslySetInnerHTML` atas HTML mentah |
| Ekstraksi URL | `@mozilla/readability` + `jsdom` di Node runtime | reliable, dipakai Firefox Reader |
| Validasi | Zod 4 untuk env, form, body API, dan seluruh output AI | satu bahasa validasi |
| Form | React Hook Form + `@hookform/resolvers/zod` | form kompleks (editor, kontribusi, AI config) |
| Search params | typed parser sendiri (`src/lib/search-params.ts`) + Server Component | `nuqs` butuh client provider; filter di sini server-first |
| Animasi | CSS transition/`@keyframes` saja, tanpa `framer-motion` | target LCP mobile; motion di brief bersifat opsional |
| Carousel | tidak dipakai; feed murni native scroll + `scroll-snap: proximity` | instruksi native-scroll-first |
| State client | Server Actions + `useTransition`; tanpa TanStack Query | tidak ada kebutuhan cache client yang nyata di MVP |
| Font | `Bricolage Grotesque` (display) + `Manrope` (body) via `next/font/google` | Space Grotesk/Inter adalah default yang membuat identitas generik; keputusan dikonfirmasi user |

### Visual world (dari `/impeccable`, seed `83837cb0`, kandidat 3)

Direction contract tersimpan di `.impeccable/surfaces/src-app-public-page-tsx.md`. Ringkasnya:
spanduk vinyl jalanan Tangerang di atas dinding charcoal. Panel warna jenuh, keyline hitam 2px,
hard shadow, mata ayam (grommet) di sudut, hem jahitan atas-bawah, patch lakban sebagai pembawa
status. Satu rail registrasi off-centre. Status adalah tanda, bukan warna. Lime tidak pernah
menyentuh running text.

---

## 2. Fase kerja

### Fase 0 — Fondasi
`package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`,
`.gitignore`, `.env.example`, `src/lib/env.ts` (Zod, server-only), `src/app/globals.css` (token +
`@theme`), `src/app/layout.tsx` (font, metadata dasar).

### Fase 1 — Design system
`src/components/ui/*` (button, input, textarea, label, select, switch, checkbox, tabs, dialog,
alert-dialog, sheet, dropdown-menu, badge, card, table, skeleton, toaster, empty-state, field).
`src/components/shared/*`: `BannerPanel`, `Grommet`, `Hem`, `TapePatch`, `StatusMark`, `Rail`,
`ReadCost`, `WordMark`.

### Fase 2 — Database
`supabase/migrations/0001_init.sql` … `0006_functions.sql`, `supabase/seed.sql`.
13 tabel, enum, index, trigger `updated_at`, trigger `on_auth_user_created`, RLS penuh,
wrapper Vault (`SECURITY DEFINER`, dynamic SQL sehingga migration tetap jalan bila extension
`supabase_vault` belum aktif), fungsi `increment_article_view`.

### Fase 3 — Data layer + fallback demo
`src/lib/supabase/{client,server,admin,middleware}.ts`, `src/lib/data/*`.
Bila env Supabase kosong dan `NODE_ENV !== 'production'`: pakai fixture demo (isi sama dengan
`seed.sql`) supaya `npm run dev` langsung menampilkan desain. Di production tanpa env: fixture
mati, halaman menampilkan state konfigurasi, tidak crash dan tidak menyajikan data palsu.

### Fase 4 — Halaman publik
`/`, `/vibes`, `/suara`, `/hustle`, `/story`, `/artikel/[slug]`, `/kontribusi`, `/tentang`,
`not-found.tsx`, `loading.tsx`, `error.tsx`, `app/sitemap.ts`, `app/robots.ts`, `opengraph-image`.
Komponen: `FeedCard`, `CategoryRail`, `BottomNav`, `ReactionBar`, `ArticleBody`, `RelatedRail`,
`BentoTile`, `ContributionForm`.

### Fase 5 — API publik
`/api/reactions` (anon session cookie httpOnly, toggle, rate limit),
`/api/contributions` (Zod, rate limit memori + DB per hash IP, status `pending`).

### Fase 6 — Auth + CMS
`src/middleware.ts` (refresh session, gate `/admin/*`), `src/lib/auth.ts` (`requireRole`),
admin shell (sidebar desktop, sheet mobile), dashboard, daftar konten, editor artikel
(autosave server action + debounce, preview, dialog publish/schedule), moderasi kontribusi.

### Fase 7 — Image pipeline
`/api/images/sign` (signed upload Cloudinary), `/api/images/search` (proxy Unsplash/Pexels/Pixabay
+ sisa kuota), `/api/images/ingest` (transfer stock → Cloudinary + simpan atribusi).
`ImagePicker` dengan tab Upload / Unsplash / Pexels / Pixabay.

### Fase 8 — AI engine
`src/lib/ai/{secrets,gateway,fallback,prompts,prompt-defaults,schemas,tasks,json}.ts`.
`/api/ai/generate`, `/api/ai/test`. Halaman `/admin/ai` (provider, key, prioritas, test, log).

### Fase 9 — Studio
`/admin/ai/content-studio` (wizard 5 tahap, `ai_generation_jobs`, version history),
`/admin/ai/rewrite-studio` (multi URL → ekstraksi SSRF-safe → decision → draft + attribution map
→ similarity check n-gram server-side).

### Fase 10 — Verifikasi & dokumen
`npm run lint`, `npm run typecheck`, `npm run build`, `impeccable detect`, screenshot 375/390/768/1440,
finish review, `DESIGN.md`, `README.md`, `BUILD_STATUS.md`.

---

## 3. Peta file utama

```text
src/app/(public)/{page,vibes,suara,hustle,story,artikel/[slug],kontribusi,tentang}
src/app/(admin)/admin/{login,page,konten,konten/baru,konten/[id]/edit,kontribusi,ai,ai/content-studio,ai/rewrite-studio,settings}
src/app/api/{ai/generate,ai/test,images/search,images/sign,images/ingest,rewrite/extract,reactions,contributions}
src/components/{public,admin,ai,editor,shared,ui}
src/lib/{supabase,ai,data,security}/…, src/lib/{cloudinary,content,seo,env,rate-limit,auth,utils}.ts
src/types/…  src/hooks/…  src/middleware.ts
supabase/migrations/*.sql  supabase/seed.sql
```

---

## 4. Keamanan (non-negotiable)

1. `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, key stock photo, dan API key AI hanya
   dibaca di modul `server-only`. `src/lib/env.ts` mengimpor `server-only`.
2. API key AI tidak pernah plaintext di tabel biasa: `ai_api_keys.vault_secret_id` saja.
   Production wajib `SupabaseVaultSecretStore`; adapter development terenkripsi AES-256-GCM di
   file lokal gitignored dan menolak jalan bila `NODE_ENV === 'production'`.
3. Tidak ada logging API key, header `Authorization`, atau `process.env`.
4. `ai_usage_log` menyimpan metadata saja, bukan prompt/response mentah.
5. Semua output AI lewat Zod. Artikel hasil AI selalu `draft`/`needs_review`.
6. SSRF guard: skema http(s), DNS lookup + blokir private/loopback/link-local/CGNAT/reserved
   (IPv4+IPv6), blokir port non-80/443, redirect manual maks 3 hop dengan validasi ulang tiap hop,
   batas ukuran respons 2 MB, timeout 12 s, UA jujur, tanpa bypass paywall/anti-bot.
7. RLS aktif di 13 tabel. Public read hanya `articles.status = 'published'` (dan aset turunannya).
   `ai_*` hanya admin/editor sesuai peran; `ai_api_keys` tanpa policy publik.
8. Markdown disanitasi di server sebelum render.

---

## 5. Risiko & mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Supabase Vault tidak aktif di project baru | wrapper `SECURITY DEFINER` dengan dynamic SQL + `SecretStore` dev adapter; README berisi cara aktivasi |
| Rate limit in-memory tidak akurat di serverless | rate limit ganda: memori per instance + hitungan DB per hash IP; README merekomendasikan Upstash untuk skala |
| `jsdom` berat di serverless | route ekstraksi memakai `runtime = 'nodejs'`, `maxDuration`, dan hanya dipanggil dari admin |
| Provider AI mengembalikan JSON tidak valid | satu kali repair request, lalu Zod; gagal → job `failed` dengan pesan aman |
| `next/font/google` butuh jaringan saat build | fallback stack lokal di `--font-*`; kegagalan font tidak memblokir render |
| Feed full-viewport merusak LCP | hanya kartu pertama `priority`, sisanya lazy; tanpa library animasi |

---

## 6. Asumsi

1. Belum ada credential apa pun di mesin ini, jadi seluruh integrasi eksternal diuji lewat
   interface + error state, bukan panggilan nyata. Semua yang belum terverifikasi ditulis apa adanya
   di `BUILD_STATUS.md`.
2. Deployment target Vercel, Node runtime untuk route yang butuh `jsdom`/`crypto`.
3. Fase 2 (komentar, personalisasi, pembayaran, push) tidak dibangun; struktur data dan modul
   disiapkan agar penambahan tidak butuh migrasi besar.
