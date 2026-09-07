# PRD: TNG Daily — Portal Media Anak Muda Tangerang

**Versi:** 1.0
**Domain:** tngdaily.com
**Tanggal:** 5 September 2026
**Pemilik Produk:** Santika Reza

---

## 1. Latar Belakang & Visi

TNG Daily adalah portal media digital yang menyasar anak muda Tangerang (Gen Z & Milenial muda), dengan positioning anti-mainstream — bukan "koran digital" formal seperti kompetitor eksisting (TangerangNews, InfoTangerang, BeritaTangerang, dll), melainkan ekosistem konten yang terasa seperti "teman ngobrol harian".

**Visi:** Menjadi top-of-mind media bagi anak muda Tangerang dalam 12-18 bulan.

**Masalah yang dipecahkan:** Semua media lokal Tangerang saat ini berformat generik (berita kriminal/pemerintahan, gaya kaku, SEO-first, teks statis). Tidak ada yang bicara dengan bahasa, format, dan kecepatan konsumsi anak muda (short-form, mobile-first, sosial-first, interaktif).

**Diferensiasi utama:**

- Bahasa santai, sedikit sarkas, berani mengambil sudut pandang (bukan sekadar melapor fakta datar)
- Mobile-first sejak arsitektur, bukan "desktop yang di-responsive-kan"
- Website adalah rumah arsip & monetisasi, bukan kanal akuisisi utama (akuisisi terjadi di TikTok/Instagram/WA)
- UI/UX yang punya karakter visual kuat, bukan template WordPress generik

---

## 2. Target Audience

### Primary Persona — "Dinda", 19-26 tahun

- Tinggal/kuliah/kerja di Tangerang Kota, Tangerang Selatan, atau Kabupaten Tangerang
- Screen time tinggi di TikTok & Instagram, mengakses berita lewat mobile browser, jarang buka desktop
- Mencari: info nongkrong/kuliner, event lokal, loker/side hustle, isu yang relevan dengan hidupnya (macet, harga sewa, transportasi), hiburan ringan tapi tidak receh
- Skeptis terhadap media formal, tertarik dengan konten yang terasa jujur dan "milik mereka"

---

## 3. Pilar Konten

| Pilar | Deskripsi | Contoh Konten |
| --- | --- | --- |
| TNG Vibes | Kultur, nongkrong, kuliner, event, gaya hidup | Ranking spot nongkrong, review kuliner viral, kalender event lokal |
| Suara Tangerang | Isu lokal dari sudut pandang anak muda | Explainer macet/transportasi, vox pop jalanan, polling isu |
| TNG Hustle | Info praktis ekonomi | Loker lokal, UMKM naik kelas, harga kos/sewa |
| TNG Story | Storytelling/cerita nyata warga | Serial cerita anonim, urban legend lokal |

---

## 4. Struktur Informasi (Sitemap)

```text
/ (Home – Feed vertikal utama)
/vibes (kategori: kultur, nongkrong, event, kuliner)
/suara (kategori: isu lokal, opini, polling)
/hustle (kategori: loker, UMKM, direktori harga sewa/kos)
/story (kategori: cerita/storytelling)
/artikel/[slug] (halaman detail konten)
/kontribusi (form submit cerita/rekomendasi dari user)
/tentang
/admin (dashboard internal, protected)
  /admin/konten (CRUD artikel)
  /admin/kontribusi (moderasi submission user)
  /admin/analytics
```

---

## 5. Fitur MVP (Fase 1 — Bulan 1-3)

1. **Feed vertikal di homepage** — full-viewport card per konten, swipe/scroll ke konten berikutnya, mirip pola FYP TikTok.
2. **Halaman detail artikel** — mendukung teks, gambar, embed video/TikTok/Instagram.
3. **Kategori/pilar** — filter konten berdasarkan 4 pilar (Vibes, Suara, Hustle, Story).
4. **Reaksi cepat** — like/react tanpa perlu login penuh (gunakan session/local identifier), share ke WA/IG/TikTok.
5. **Form kontribusi komunitas** — user submit cerita/rekomendasi tempat, masuk ke moderasi admin sebelum publish.
6. **Dashboard admin sederhana** — CRUD artikel, moderasi kontribusi, lihat statistik dasar (views, reaksi).
7. **SEO dasar** — meta tag dinamis, sitemap.xml, schema.org Article/NewsArticle, OG image otomatis.
8. **Newsletter/WA Channel signup widget** — capture kontak untuk retensi.

## 6. Fitur Fase 2 (Bulan 4-6)

- Sistem akun user penuh (Supabase Auth) — profil, riwayat baca, saved articles
- Personalisasi feed berdasarkan pilar yang paling sering dibaca
- Komentar berulir per artikel
- Bento grid directory (halaman `/hustle` untuk loker & UMKM, layout modular)
- Notifikasi push (web push atau integrasi WA Business API)
- Panel monetisasi — slot iklan/listing berbayar untuk UMKM lokal

---

## 7. User Flow Utama

### Flow 1 — Pembaca casual (mayoritas trafik)

1. Klik link dari TikTok/Instagram bio atau story → landing di halaman artikel spesifik
2. Baca artikel → scroll ke bawah → sistem menyarankan artikel terkait (mirip "up next")
3. Tap reaksi/share → opsional lanjut swipe ke feed vertikal homepage
4. Exit-intent: muncul prompt subtle untuk join WA Channel

### Flow 2 — Pembaca loyal (retensi)

1. Buka langsung tngdaily.com atau klik dari WA Channel
2. Landing di feed vertikal homepage → swipe berdasarkan pilar minat
3. Filter ke pilar tertentu (misal Hustle untuk cek loker baru)
4. Save artikel untuk dibaca ulang (butuh akun ringan)

### Flow 3 — Kontributor komunitas

1. Buka `/kontribusi` dari CTA di artikel atau media sosial
2. Isi form (judul, kategori, isi cerita/rekomendasi, upload foto)
3. Submit → masuk queue moderasi
4. Admin approve/reject via `/admin/kontribusi` → jika approve, otomatis publish dengan atribusi ke kontributor

### Flow 4 — Admin/editor

1. Login ke `/admin` (Supabase Auth, role-based: admin/editor)
2. Buat artikel baru (editor rich-text/markdown, upload media via Cloudinary)
3. Assign pilar & tag
4. Publish langsung atau schedule
5. Cek analytics dasar (artikel terpopuler, sumber trafik)

---

## 8. Desain UI/UX (Ringkasan Keputusan)

**Arah visual terpilih:** kombinasi 3 konsep —

- **Feed Nongkrong** sebagai kerangka navigasi utama (vertical scroll, full-card layout, interaksi swipe)
- **Anak Tangerang Berani** (neo-brutalism ringan) untuk tipografi, border, dan CTA button — border tegas 2-3px, shadow keras, warna kontras tinggi
- **Info Hub** (bento grid) khusus untuk halaman direktori (`/hustle`)

**Prinsip desain:**

- Mobile-first mutlak — desain dan develop dari breakpoint 375px terlebih dahulu, baru scale up
- Bottom thumb-zone untuk semua CTA interaktif utama (reaksi, share, save)
- Dark mode sebagai default theme, dengan aksen warna dopamine (oranye/lime) untuk elemen interaktif
- Tipografi besar dan tegas untuk headline, hierarki visual jelas
- Minim animasi berat (hindari WebGL/parallax berlebihan) — prioritaskan kecepatan load di atas estetika berlebihan
- Skeleton loading, bukan spinner, untuk transisi antar konten

**Komponen kunci yang perlu dibangun (shadcn/ui base):**

- `FeedCard` (kartu artikel full-viewport dengan swipe gesture)
- `BentoTile` (kartu modular untuk direktori)
- `ReactionBar` (like/share/save, posisi fixed bottom-right)
- `CategoryPill` (filter pilar, horizontal scroll di top)
- `ContributionForm` (multi-step form dengan upload gambar ke Cloudinary)
- `AdminEditor` (rich text/markdown editor + media manager)

---

## 9. Tech Stack

| Layer | Pilihan | Alasan |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript | Ekosistem vibe-coding matang (v0, shadcn/ui), mendukung fitur dinamis (auth, dashboard, personalisasi) |
| Styling | Tailwind CSS + shadcn/ui | Cepat untuk generate komponen via AI, konsisten dengan stack Anda saat ini |
| Database & Auth | Supabase (Postgres + Auth + Storage) | Free tier cukup untuk MVP, built-in RLS untuk keamanan role admin/editor |
| Media | Cloudinary | Optimasi gambar/video, menghindari limit image transformation Vercel |
| Hosting | Vercel (Hobby → upgrade ke Pro saat monetisasi mulai jalan) | Deployment cepat, terintegrasi native dengan Next.js |
| Analytics | Vercel Analytics / Google Analytics 4 | Tracking dasar performa konten |

**Catatan penting:** Vercel Hobby plan secara ToS hanya untuk penggunaan non-komersial. Begitu ada transaksi iklan/listing berbayar, wajib upgrade ke Pro plan ($20/bulan) untuk menghindari risiko suspend.

---

## 10. Skema Database (Supabase — Draf Awal)

```sql
-- users (extend Supabase auth.users via profile table)
create table profiles (
  id uuid references auth.users primary key,
  username text unique,
  role text default 'reader', -- reader | contributor | editor | admin
  created_at timestamptz default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text not null,
  excerpt text,
  cover_image_url text,
  pillar text not null, -- vibes | suara | hustle | story
  tags text[],
  status text default 'draft', -- draft | published | scheduled
  author_id uuid references profiles(id),
  published_at timestamptz,
  view_count int default 0,
  created_at timestamptz default now()
);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id),
  session_id text, -- anonymous identifier
  type text, -- like | save | share
  created_at timestamptz default now()
);

create table contributions (
  id uuid primary key default gen_random_uuid(),
  contributor_name text,
  contributor_contact text,
  title text,
  content text,
  pillar text,
  media_urls text[],
  status text default 'pending', -- pending | approved | rejected
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table directory_listings ( -- untuk TNG Hustle: loker, UMKM
  id uuid primary key default gen_random_uuid(),
  type text, -- loker | umkm | kos
  title text,
  description text,
  contact_info text,
  location text,
  is_paid boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now()
);
```

---

## 11. Non-Functional Requirements

- **Performance:** LCP < 2.5s di koneksi 4G, gunakan ISR untuk halaman artikel, minimalkan `"use client"` hanya untuk komponen interaktif
- **SEO:** Server-side rendering untuk semua halaman publik, structured data schema.org, sitemap otomatis, OG tags dinamis per artikel
- **Accessibility:** Kontras warna minimal WCAG AA meskipun tema brutalist/dark, alt text wajib untuk semua gambar
- **Security:** Row Level Security (RLS) Supabase aktif di semua tabel, role-based access untuk admin/editor, rate limiting pada form kontribusi untuk cegah spam
- **Scalability:** Struktur data dan API dirancang agar mudah menambah pilar baru tanpa migrasi besar

---

## 12. Metrik Sukses (KPI)

| Metrik | Target 3 Bulan | Target 6 Bulan |
| --- | --- | --- |
| Unique visitors/bulan | 10.000 | 50.000 |
| Waktu rata-rata di situs | > 1.5 menit | > 2.5 menit |
| Kontribusi user masuk/bulan | 20 | 100 |
| WA Channel/newsletter subscriber | 500 | 3.000 |
| Bounce rate | < 60% | < 45% |

---

## 13. Instruksi Khusus untuk AI Coding Agent

- Bangun mobile-first: desain dan implementasi dimulai dari breakpoint 375px, baru scale ke tablet/desktop
- Gunakan Server Components sebagai default, `"use client"` hanya untuk elemen interaktif spesifik (reaksi, swipe, form)
- Semua gambar wajib melalui Cloudinary, jangan gunakan Next.js Image Optimization built-in untuk menghindari limit transformasi Vercel
- Ikuti design system neo-brutalism ringan: border solid 2-3px, shadow keras (bukan blur), warna kontras tinggi dengan dark mode default
- Prioritaskan fitur MVP di Bagian 5 sebelum mengerjakan Fase 2
- Semua tabel Supabase wajib menggunakan RLS, jangan expose service role key ke client
