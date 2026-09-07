# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (React) application

## Users

Anak muda, warga Tangerang, dan pembaca lokal yang mencari update harian, direktori tempat/hustle, serta konten media digital komunitas Tangerang (TNG Daily).

## Product Purpose

TNG Daily adalah platform media digital & direktori harian lokal Tangerang dengan pengalaman navigasi mobile-first vertical card feed (Feed Nongkrong), bento grid direktori (/hustle), serta estetika visual neo-brutalism ringan ("Anak Tangerang Berani").

## Positioning

Platform media harian lokal Tangerang yang memadukan navigasi swipe vertical card feed ala media sosial modern dengan direktori bento grid yang terstruktur, dibungkus visual neo-brutalism tegas dan warna dopamine (oranye/lime).

## Operating Context

Penggunaan utama via mobile browser (375px primary breakpoint), bottom thumb-zone untuk interaksi cepat, dark mode default, serta loading cepat tanpa animasi berat.

## Capabilities and Constraints

- **Feed Nongkrong**: Vertical full-card scroll dengan interaksi swipe untuk navigasi antar konten.
- **Info Hub (/hustle)**: Layout bento grid modular untuk direktori bisnis/hustle lokal.
- **ReactionBar**: Kontrol interaksi (like, share, save) pada posisi fixed bottom-right thumb zone.
- **CategoryPill**: Navigasi filter pilar kategori dengan horizontal scroll di area top header.
- **ContributionForm**: Form kontribusi multi-step dengan upload gambar (Cloudinary).
- **AdminEditor**: Rich text / Markdown editor dan media manager untuk pengelolaan konten.
- **Batasan Visual & Performa**: Dark mode sebagai tema default, border 2-3px tegas, shadow keras, aksen dopamine (oranye/lime), skeleton loading (tanpa spinner), serta zero heavy WebGL/parallax.

## Brand Commitments

- **Nama Product**: TNG Daily
- **Gaya Visual**: Neo-brutalism ringan ("Anak Tangerang Berani")
- **Warna & Theme**: Dark mode default, kontras tinggi, aksen warna dopamine (oranye/lime)
- **Elemen UI**: Border tegas 2-3px, shadow keras, tipografi headline besar & bold

## Evidence on Hand

- Spesifikasi UI/UX dan arsitektur komponen lengkap dari pengguna: Feed Nongkrong (vertical card), Bento Grid (/hustle), ReactionBar (bottom-right thumb zone), CategoryPill, ContributionForm, AdminEditor.

## Product Principles

1. **Mobile-First & Thumb-Zone Primary**: Dirancang dari breakpoint 375px terlebih dahulu. Semua CTA utama berada dalam jangkauan ibu jari (bottom thumb-zone).
2. **Neo-Brutalism Ringan & Berani**: Tipografi besar & tegas, border 2-3px, shadow keras, warna kontras tinggi tanpa mengorbankan keterbacaan.
3. **Performa Ringan & Ringkas**: Memprioritaskan kecepatan load. Menggunakan skeleton loader alih-alih spinner atau animasi WebGL/parallax berat.
4. **Struktur Komunitas Interaktif**: Memudahkan interaksi pengguna (like, save, share) dan kontribusi konten komunitas.

## Accessibility & Inclusion

- Dark mode default dengan aksen neon kontras tinggi yang memenuhi rasio keterbacaan.
- Target sentuh (touch target) pada komponen interaktif disesuaikan untuk kenyamanan penggunaan ibu jari (minimal 44x44px).
- Hierarki tipografi tegas untuk kemudahan scanning konten.
