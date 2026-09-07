# PRD Addendum: Custom CMS + AI Content Engine — TNG Daily

**Versi:** 1.0
**Dokumen ini melengkapi:** TNG_Daily_PRD.md (Bagian 5-9)
**Fokus:** Dashboard admin custom dengan AI terintegrasi untuk produksi & manajemen konten

---

## 1. Ringkasan Modul

Modul ini menambahkan "otak AI" ke dashboard admin TNG Daily, dengan tiga sistem inti:

1. **AI Provider Manager** — konfigurasi multi-provider/multi-API-key dengan fallback otomatis, disimpan aman
2. **AI Content Pipeline** — generate ide → judul → outline → artikel penuh → metadata SEO, dengan gaya khas TNG Daily
3. **AI Rewrite Engine** — tarik 1+ URL sumber, sintesis jadi artikel baru dengan atribusi natural
4. **Image Sourcing Module** — upload lokal + stock photo (Unsplash, Pexels, dst) langsung dari editor

Target: AI menangani ~99% proses produksi (ideasi sampai draft siap review), manusia hanya melakukan quality check, penyesuaian akhir, dan approve/publish.

---

## 2. AI Provider Manager

### 2.1 Kebutuhan Fungsional

- User (admin) dapat menambahkan provider AI custom yang OpenAI-compatible (base URL + API key + model name)
- Mendukung lebih dari 1 API key per provider (misal 2 key OpenAI untuk rotasi kuota)
- Mendukung lebih dari 1 provider berbeda (OpenAI, Anthropic-compatible, DeepSeek, OpenRouter, Groq, model self-hosted, dll) — semua via schema OpenAI-compatible `/v1/chat/completions`
- User mengatur **urutan prioritas fallback** (drag-and-drop di UI): Provider A (key 1) → Provider A (key 2) → Provider B → dst
- Sistem otomatis pindah ke key/provider berikutnya jika terjadi error (401, 429, timeout, 5xx) tanpa mengganggu proses generate
- Dashboard menampilkan status kesehatan tiap key (aktif/error/rate-limited) dan log pemakaian terakhir

### 2.2 Keamanan Penyimpanan API Key

API key **tidak pernah** disimpan sebagai plaintext di kolom database biasa. Gunakan **Supabase Vault**:

- Saat user submit API key baru dari form dashboard, backend memanggil `vault.create_secret(key, name, description)` — Vault mengenkripsi nilai dan mengembalikan `secret_id` [web:73], [web:79]
- Tabel `ai_api_keys` hanya menyimpan `secret_id` (UUID) dan metadata (nama provider, label, status), **bukan** key asli
- Decrypt hanya terjadi di dalam satu fungsi `SECURITY DEFINER` yang dipanggil server-side saat proses generate berjalan — client (browser admin) tidak pernah menerima key asli, bahkan saat menampilkan daftar key di UI (tampilkan hanya 6 karakter terakhir, format `sk-...aB3f`) [web:75]
- Encryption key Vault dikelola terpisah oleh Supabase, tidak pernah ikut ke dalam database dump/backup dalam bentuk terbaca [web:73]
- Service role key Supabase sendiri (yang punya akses penuh) hanya boleh dipakai di server (API route/Edge Function), **tidak pernah** dikirim ke client

### 2.3 Skema Database

```sql
create table ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- label bebas, misal "OpenAI Utama"
  base_url text not null, -- endpoint OpenAI-compatible
  default_model text not null,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table ai_api_keys (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references ai_providers(id),
  vault_secret_id uuid not null, -- referensi ke vault.secrets, BUKAN key asli
  key_label text, -- untuk identifikasi di UI, misal "Key backup #2"
  key_preview text, -- 6 karakter terakhir saja, untuk ditampilkan
  priority int not null, -- urutan fallback, angka kecil = diutamakan
  status text default 'active', -- active | rate_limited | error | disabled
  last_used_at timestamptz,
  last_error text,
  created_at timestamptz default now()
);

create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references ai_api_keys(id),
  task_type text, -- ideation | title | outline | draft | seo | rewrite
  tokens_used int,
  latency_ms int,
  success boolean,
  created_at timestamptz default now()
);
```

### 2.4 Logika Fallback (Alur Eksekusi)

```text
1. Sistem ambil daftar ai_api_keys aktif, urutkan berdasarkan priority
2. Coba request ke key priority tertinggi
3. Jika sukses → simpan hasil, log ke ai_usage_log, selesai
4. Jika gagal:
   a. Klasifikasi error dulu — error transient (429, timeout, 5xx) → lanjut ke key berikutnya
      error permanen (401 invalid key, 400 bad request) → tandai key status='error', skip, lanjut ke berikutnya, JANGAN retry key yang sama [web:78], [web:82]
   b. Retry maksimal 2-3 kali dengan exponential backoff sebelum pindah key [web:77]
   c. Update status key di database (rate_limited/error) agar tidak dicoba lagi sampai reset
5. Jika SEMUA key di semua provider gagal → tampilkan error jelas ke admin, jangan silent fail [web:78]
6. Setiap kegagalan/fallback tercatat di log agar admin bisa lihat provider mana yang paling reliable
```

Batasi rantai fallback maksimal 3-4 langkah agar latensi tidak membengkak tanpa manfaat berarti [web:78].

### 2.5 UI — Menu "Konfigurasi AI"

- List provider dengan badge status (Aktif/Error), tombol tambah provider baru
- Per provider: sub-list API key dengan drag handle untuk reorder priority, preview key ter-mask, tombol test connection
- Grafik sederhana pemakaian per provider (dari `ai_usage_log`) — total request, success rate, rata-rata latensi
- Toggle "Gunakan sebagai default untuk task tertentu" (misal: provider X khusus untuk generate gambar prompt, provider Y untuk artikel panjang)

---

## 3. Image Sourcing Module

### 3.1 Sumber Gambar

| Sumber | Cara Integrasi | Catatan Limit |
| --- | --- | --- |
| Upload lokal | Upload langsung ke Cloudinary dari editor | Sesuai kuota Cloudinary |
| Unsplash API | Search & insert langsung dari editor | Free/Demo: 50 request/jam. Ajukan production access untuk naik ke 1000 request/jam [web:74], [web:76], [web:80] |
| Pexels API | Search & insert langsung dari editor | Free: ±200 request/menit (~12.000/jam), jauh lebih lega dari Unsplash [web:80] |
| Pixabay (opsional tambahan) | Sama seperti Pexels | Free, tanpa limit ketat |

### 3.2 Kebutuhan Fungsional

- Di editor artikel, ada tombol "Cari Gambar" yang membuka panel search dengan tab: Upload, Unsplash, Pexels, Pixabay
- Search query bisa manual atau **otomatis disarankan AI** berdasarkan judul/isi artikel
- Gambar yang dipilih otomatis diunggah ulang ke Cloudinary (bukan hotlink langsung ke Unsplash/Pexels) agar tetap terkontrol dan teroptimasi, plus menyimpan atribusi fotografer sesuai lisensi masing-masing platform
- Atribusi otomatis disisipkan sebagai caption/metadata (wajib untuk Unsplash & Pexels sesuai lisensi mereka)

### 3.3 Keamanan API Key Stock Photo

Sesuai permintaan Anda, API key Unsplash/Pexels/dst disimpan sebagai **Vercel Environment Variables** (server-side only, bukan `NEXT_PUBLIC_*`), diakses lewat API route `/api/images/search` yang jadi proxy — browser admin tidak pernah menerima key asli ini secara langsung.

---

## 4. AI Content Pipeline — Generate dari Topik

### 4.1 Alur Kerja (5 Tahap)

```text
[Tahap 1: Ideasi]
Input: kategori/pilar, tren terkini (opsional link referensi)
Output: 5-10 ide topik dengan angle unik, ditandai pilar (Vibes/Suara/Hustle/Story)
    ↓ admin pilih 1 ide (atau minta regenerate)
[Tahap 2: Judul]
Input: ide terpilih
Output: 5 opsi judul dengan gaya berbeda (provokatif, informatif, storytelling)
    ↓ admin pilih/edit judul
[Tahap 3: Outline]
Input: judul final
Output: struktur artikel (poin-poin, urutan narasi, hook pembuka, penutup)
    ↓ admin bisa edit outline sebelum lanjut
[Tahap 4: Draft Artikel Penuh]
Input: outline yang disetujui
Output: artikel lengkap sesuai gaya TNG Daily (lihat Bagian 5)
    ↓ admin review/edit di editor
[Tahap 5: SEO Metadata]
Input: artikel final
Output: meta title, meta description, slug, tag/keyword, alt text gambar, schema.org markup
```

Setiap tahap adalah tombol terpisah di UI editor ("Generate Ide", "Generate Judul", dst) — admin bisa berhenti, edit manual, lalu lanjut ke tahap berikutnya. Ini membuat AI membantu 99% pekerjaan tanpa menghilangkan kontrol editorial manusia di titik kritis.

### 4.2 Sistem Prompt — Struktur Wajib

Setiap task pipeline menginjeksikan **system prompt berlapis**:

**Layer 1 — Brand Voice TNG Daily (selalu disertakan di semua task):**

- Target pembaca: anak muda Tangerang 18-27 tahun
- Nada: santai, jujur, kadang sarkas ringan, berani ambil sudut pandang — bukan netral kaku ala rilis pers
- Gunakan bahasa campuran Indonesia santai + istilah lokal Tangerang/Banten secukupnya, hindari paksaan slang yang tidak natural
- Kalimat pendek-menengah bervariasi, hindari struktur paragraf yang seragam persis (3 kalimat tiap paragraf terus-menerus terasa robotic)

**Layer 2 — Anti-Pola-AI (instruksi eksplisit):**

- Dilarang menggunakan em dash (—) sebagai pengganti koma/titik dua; gunakan tanda baca standar Indonesia
- Dilarang menggunakan emoji di dalam badan artikel
- Hindari kalimat pembuka klise ala AI: "Di era digital saat ini...", "Tidak dapat dipungkiri...", "Dalam dunia yang terus berkembang...", "Selain itu, penting untuk dicatat bahwa..."
- Hindari struktur "rule of three" berlebihan (selalu menyebutkan 3 poin dengan pola sama)
- Hindari kata transisi AI-signature yang berulang: "selain itu", "di sisi lain", "pada akhirnya", "secara keseluruhan" — jika perlu transisi, variasikan atau hilangkan, biarkan ide mengalir alami
- Variasikan panjang kalimat secara signifikan dalam satu paragraf — campur kalimat pendek tajam dengan kalimat lebih panjang
- Sisipkan opini/observasi personal khas penulis lokal (bukan generalisasi netral universal)
- Hindari kesimpulan yang merangkum ulang semua poin di akhir secara mekanis — akhiri dengan closing yang punya "rasa", bisa pertanyaan retoris, punchline, atau observasi tajam

**Layer 3 — Task-Specific (berbeda tiap tahap):**

- Ideasi: fokus angle yang belum dibahas kompetitor lokal, relevan dengan isu Tangerang terkini
- Judul: hindari clickbait murahan tanpa substansi, tapi tetap punya hook kuat
- Outline: pastikan ada hook di 2 kalimat pertama (untuk mobile reader yang cepat scroll)
- Draft: panjang disesuaikan pilar (Vibes/Story bisa lebih naratif panjang, Hustle harus padat-informatif)
- SEO: keyword natural tidak dipaksakan (keyword stuffing dihindari), meta description harus terasa seperti undangan membaca bukan ringkasan robotic

### 4.3 Catatan Realistis tentang "Bebas Plagiarisme" dan "Tidak Terdeteksi AI"

Dua hal ini perlu dipisahkan secara jujur agar ekspektasi sistem realistis:

- **Bebas plagiarisme** bisa dijamin secara teknis lewat kombinasi: prompt yang meminta parafrase penuh (bukan menyalin kalimat sumber), plus pengecekan similarity otomatis (lihat Bagian 5.3) sebelum publish.
- **"Tidak terdeteksi sebagai hasil AI"** secara mutlak tidak bisa dijamin 100% oleh sistem manapun — detector AI terus berevolusi. Yang bisa dan realistis dilakukan sistem ini adalah membuat tulisan **terasa manusiawi dan khas TNG Daily** lewat menghindari pola-pola generik di atas, yang secara alami juga menurunkan skor deteksi AI karena pola itulah yang dikenali detector. Fokus sistem ini pada kualitas dan orisinalitas suara, bukan pada "menipu" detector secara khusus.

---

## 5. AI Rewrite Engine — Dari URL Sumber

### 5.1 Kebutuhan Fungsional

- Admin input 1 atau lebih URL sumber (misal berita dari media lain)
- Sistem fetch konten dari tiap URL (server-side scraping/parsing, ekstrak judul + isi utama, buang navigasi/iklan)
- AI membaca semua sumber, **mensintesis** (bukan menerjemahkan 1:1) jadi artikel baru dengan angle dan gaya TNG Daily sendiri
- Jika lebih dari 1 sumber, AI menggabungkan informasi yang saling melengkapi/berbeda perspektif, bukan sekadar menjiplak salah satu

### 5.2 Atribusi Natural

Sistem prompt khusus mewajibkan penyisipan atribusi sumber secara natural di dalam narasi, bukan sekadar catatan kaki, contoh pola: "Dilansir dari [nama media]...", "Seperti dilaporkan [nama media] sebelumnya...", "Mengutip data dari [nama media]...". Nama sumber wajib disebutkan minimal sekali per sumber yang dipakai substansinya — ini bukan hanya soal gaya, tapi standar etika jurnalistik dasar agar TNG Daily tidak dianggap plagiat oleh media lain.

### 5.3 Validasi Sebelum Publish

- Sistem menjalankan pengecekan similarity sederhana (perbandingan n-gram/embedding) antara draft hasil rewrite dengan teks sumber asli
- Jika similarity di atas threshold (misal >25% kemiripan frasa panjang), tampilkan warning ke admin dengan highlight kalimat yang terlalu mirip, minta AI regenerate bagian tersebut
- Admin tetap menjadi gatekeeper akhir sebelum publish — sistem membantu, tidak menggantikan tanggung jawab editorial

### 5.4 Skema Database Tambahan

```sql
create table rewrite_jobs (
  id uuid primary key default gen_random_uuid(),
  source_urls text[] not null,
  extracted_content jsonb, -- hasil scraping per URL
  generated_article_id uuid references articles(id),
  similarity_score float,
  status text default 'pending', -- pending | processing | needs_review | completed
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

---

## 6. Arsitektur Teknis Modul AI

```text
[Admin Dashboard - Next.js Client]
        │ (tidak pernah pegang API key asli)
        ▼
[API Routes / Server Actions - Next.js Server]
        │
        ├─→ [AI Gateway Layer] — resolve provider+key dari Vault,
        │    jalankan fallback chain, log usage
        │         │
        │         ▼
        │    [Provider OpenAI-compatible endpoint]
        │
        ├─→ [Image Search Proxy] — pakai Vercel env var,
        │    proxy ke Unsplash/Pexels API
        │
        └─→ [Scraper Service] — fetch & parse URL sumber
                 │
                 ▼
        [Supabase: Vault + Postgres (RLS aktif)]
```

Prinsip kunci: **client (browser) tidak pernah menyentuh API key asli dalam bentuk apapun** — semua request ke provider AI dan stock photo API selalu melalui server route sebagai proxy.

---

## 7. Instruksi Tambahan untuk AI Coding Agent

- Bangun `AI Gateway Layer` sebagai modul terpisah dan reusable (bukan hardcode di satu komponen), karena akan dipakai oleh 5 task pipeline + rewrite engine
- Semua panggilan ke provider AI harus lewat satu fungsi terpusat yang menangani fallback, retry, dan logging — jangan duplikasi logic di tiap task
- System prompt (Bagian 4.2) harus disimpan sebagai template terpisah di database (`ai_prompt_templates`) atau file config, **bukan** hardcoded di dalam kode, agar bisa diedit tanpa deploy ulang
- Implementasikan rate-limit awareness untuk Unsplash (50/jam di mode demo) — tampilkan sisa kuota di UI dan prioritaskan Pexels sebagai default karena limitnya jauh lebih lega [web:80]
- Untuk scraping URL sumber, tangani dengan graceful failure jika situs sumber block scraping (tampilkan error jelas ke admin, jangan crash silent)
- Tambahkan kolom `generated_by_ai` (boolean) dan `ai_provider_used` (text) di tabel `articles` untuk tracking internal, walau tidak ditampilkan ke publik

```sql
alter table articles add column generated_by_ai boolean default false;
alter table articles add column ai_provider_used text;
alter table articles add column source_rewrite_job_id uuid references rewrite_jobs(id);
```
