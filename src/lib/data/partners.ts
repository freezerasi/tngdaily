import "server-only";

import { allowsMockContent } from "@/lib/content-environment";
import { normaliseProvenance } from "@/lib/content-environment";
import type { MediaProvenance, Pillar } from "@/types/domain";

/**
 * Partner Stories: commercial content, kept structurally separate from
 * editorial.
 *
 * Two guarantees this module exists to make:
 *
 *   1. A partner story can never be promoted as editorial. It is its own type,
 *      so it is not assignable to `ArticleSummary` and therefore cannot enter the
 *      hero, the Editor Picks rail, the Trending view, or the article feed. The
 *      type system enforces the editorial boundary, not a convention.
 *
 *   2. The section renders nothing until there is real partner content. An empty
 *      commercial slot mid-page advertises that the space is for sale, which is
 *      worse than the absence.
 *
 * The three stories below are development samples. Every one carries
 * `isMock: true`, so production drops them. The partner names are invented
 * businesses rather than real ones: naming a real business in a fake
 * sponsorship would misrepresent a commercial relationship that does not exist.
 * The `CONTOH` marker is rendered by the card, not baked into the name, so the
 * byline reads naturally while the disclosure stays unmissable.
 */

export interface PartnerStory {
  id: string;
  slug: string;
  title: string;
  dek: string;
  /** Partner as they wish to be named in the byline. */
  partnerName: string;
  /** Commercial kind, e.g. UMKM, Event, Brand. Never a rubrik name. */
  category: string;
  /** Where the story lives. External for a partner microsite. */
  href: string;
  isExternal: boolean;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  coverProvenance: MediaProvenance | null;
  /** Advertorial body, Markdown. Rendered through the same sanitiser as news. */
  bodyMarkdown: string;
  /** Editorial adjacency, for placement only. Never shown as a rubrik badge. */
  relatedPillar: Pillar;
  publishedAt: string;
  isMock: boolean;
}

/**
 * Off unless explicitly enabled. There is no partner content yet, so the default
 * is a hidden section rather than a placeholder one.
 */
export function partnerStoriesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PARTNER_STORIES_ENABLED === "true";
}


// Fixed timestamps: a demo fixture should not appear to have been published in
// the same second the page rendered.
const SAMPLE_EPOCH = Date.UTC(2026, 8, 4, 9, 0, 0);
function sampleDate(daysAgo: number): string {
  return new Date(SAMPLE_EPOCH - daysAgo * 86_400_000).toISOString();
}

const DEV_SAMPLE: PartnerStory[] = [
  {
    id: "partner-sample-umkm",
    slug: "umkm-laundry-naik-kelas",
    title: "Dari Satu Mesin di Garasi ke Tiga Cabang dalam Empat Tahun",
    dek: "Cerita kerja sama tentang bagaimana satu usaha laundry kiloan di Tangerang menyusun ulang alur kerjanya sebelum menambah cabang.",
    partnerName: "Laundry Kilat Wangi",
    category: "UMKM",
    href: "/partner/umkm-laundry-naik-kelas",
    isExternal: false,
    coverImageUrl: "/images/partners/umkm-laundry-naik-kelas-cover.webp",
    coverImageAlt:
      "Suasana usaha laundry kiloan di Tangerang dengan tumpukan cucian rapi dan mesin cuci komersial.",
    coverProvenance: normaliseProvenance({
      sourceType: "editorial_graphic",
      credit: "Foto: Dokumentasi Editorial / Partner TNG Daily",
      isIllustrative: true,
      depictsActualLocation: false,
      depictsActualEvent: false,
      disclosure: "Foto ilustrasi contoh kerja sama UMKM laundry kiloan di Tangerang.",
    }),
    relatedPillar: "hustle",
    publishedAt: sampleDate(3),
    bodyMarkdown: `Yang paling sering ditanyakan ke pemilik usaha laundry kiloan bukan soal harga per kilo, tapi soal kapan waktunya menambah mesin. Jawaban yang biasa diberikan adalah "kalau sudah ramai". Menurut tim kami, itu jawaban yang membuat banyak usaha kecil berhenti di cabang pertama.

## Menghitung ulang sebelum menambah alat

Sebelum membeli mesin kedua, yang kami hitung adalah waktu, bukan jumlah pelanggan. Berapa lama satu keranjang berpindah dari terima, timbang, cuci, kering, lipat, sampai siap diambil. Ketika alur itu dicatat per tahap, terlihat bahwa penumpukan tidak terjadi di mesin cuci, tapi di meja lipat.

Artinya, membeli mesin cuci kedua saat itu tidak akan menambah kapasitas. Yang dibutuhkan adalah satu meja lipat tambahan dan satu orang di jam sibuk.

## Tiga hal yang kami ubah lebih dulu

Pertama, jam terima ditutup lebih awal dari jam operasional, supaya pekerjaan hari itu selesai hari itu. Kedua, harga untuk cucian yang butuh perlakuan khusus dipisah dari harga kiloan biasa. Ketiga, setiap keranjang diberi kartu tulisan tangan berisi jam masuk, sehingga siapa pun yang berjaga tahu urutannya.

Tidak ada yang canggih di tiga perubahan itu. Yang berubah adalah usaha ini berhenti menebak.

## Cabang kedua dan ketiga

Cabang kedua dibuka setelah alur di cabang pertama berjalan tanpa pemiliknya berada di tempat sepanjang hari. Itu ukuran yang kami pakai, dan menurut kami lebih berguna daripada target omzet: sebuah cabang siap ditambah ketika cabang sebelumnya tidak lagi bergantung pada satu orang.

Untuk yang sedang menjalankan usaha serupa di Tangerang, satu saran dari kami: catat waktu per tahap selama dua minggu sebelum membeli alat apa pun. Datanya biasanya menunjukkan hambatan di tempat yang tidak diduga.`,
    isMock: true,
  },
  {
    id: "partner-sample-event",
    slug: "pasar-kreatif-akhir-pekan",
    title: "Empat Puluh Tenant Lokal, Satu Akhir Pekan, Tanpa Tiket Masuk",
    dek: "Cerita kerja sama tentang cara sebuah pasar kreatif akhir pekan di Tangerang Selatan menyusun kurasi tenant dan tata ruangnya.",
    partnerName: "Pasar Kreatif Ruang Temu",
    category: "Event",
    href: "/partner/pasar-kreatif-akhir-pekan",
    isExternal: false,
    coverImageUrl: "/images/partners/pasar-kreatif-akhir-pekan-cover.webp",
    coverImageAlt:
      "Suasana ramai pengunjung di pasar kreatif akhir pekan dengan tenant kerajinan dan pakaian lokal di Tangerang Selatan.",
    coverProvenance: normaliseProvenance({
      sourceType: "editorial_graphic",
      credit: "Foto: Dokumentasi Editorial / Partner TNG Daily",
      isIllustrative: true,
      depictsActualLocation: false,
      depictsActualEvent: false,
      disclosure: "Foto ilustrasi contoh kerja sama event pasar kreatif lokal di Tangerang Selatan.",
    }),
    relatedPillar: "vibes",
    publishedAt: sampleDate(6),
    bodyMarkdown: `Pasar kreatif akhir pekan mudah dibuat dan sulit dibuat bertahan. Yang membuat pengunjung kembali biasanya bukan jumlah tenant, tapi apakah mereka menemukan sesuatu yang tidak ada di tempat lain.

## Kurasi dibatasi, bukan dimaksimalkan

Kami membatasi jumlah tenant di empat puluh, meskipun pendaftar lebih banyak. Alasannya sederhana: di atas angka itu, lorong menjadi padat dan pengunjung berhenti melihat ke kiri dan kanan. Mereka hanya berjalan lurus mencari jalan keluar.

Dari empat puluh slot, sepuluh selalu disisihkan untuk pelaku yang belum pernah ikut pasar mana pun. Ini bagian yang paling sering kami pertahankan meski secara komersial bukan pilihan teraman.

## Tata ruang yang dibuat untuk berhenti

Meja makan diletakkan di tengah, bukan di ujung. Efeknya, orang berhenti di tengah area, dan tenant di sekelilingnya ikut terlihat. Ketika area makan diletakkan di ujung seperti pada penyelenggaraan pertama, separuh tenant hampir tidak dilewati.

Panggung kecil untuk musik diletakkan membelakangi pintu masuk, supaya suara tidak menghalangi percakapan di meja tenant terdekat.

## Gratis masuk, dan alasannya

Tidak ada tiket masuk. Pendapatan datang dari sewa slot dan kerja sama, bukan dari pengunjung. Menurut kami, memasang tiket pada pasar sebesar ini akan menyaring justru orang yang paling kami harapkan datang: yang sekadar mampir karena lewat.

Jadwal, daftar tenant, dan tata letak area diumumkan lewat kanal resmi penyelenggara sebelum akhir pekan berjalan.`,
    isMock: true,
  },
  {
    id: "partner-sample-brand",
    slug: "kolaborasi-brand-lokal",
    title: "Dua Brand Tangerang Berbagi Satu Rak, dan Keduanya Naik",
    dek: "Cerita kerja sama tentang kolaborasi dua brand lokal yang memutuskan berbagi ruang display alih-alih bersaing di rak yang sama.",
    partnerName: "Kolektif Ruang Bagi",
    category: "Brand",
    href: "/partner/kolaborasi-brand-lokal",
    isExternal: false,
    coverImageUrl: "/images/partners/kolaborasi-brand-lokal-cover.webp",
    coverImageAlt:
      "Toko konsep pakaian dan produk lokal dengan rak kayu display di Tangerang.",
    coverProvenance: normaliseProvenance({
      sourceType: "editorial_graphic",
      credit: "Foto: Dokumentasi Editorial / Partner TNG Daily",
      isIllustrative: true,
      depictsActualLocation: false,
      depictsActualEvent: false,
      disclosure: "Foto ilustrasi contoh kolaborasi brand pakaian dan display lokal di Tangerang.",
    }),
    relatedPillar: "story",
    publishedAt: sampleDate(9),
    bodyMarkdown: `Dua brand yang menjual ke pembeli yang sama biasanya diasumsikan bersaing. Yang kami coba adalah asumsi sebaliknya: kalau pembelinya sama, biaya menjangkau pembeli itu bisa dibagi.

## Yang dibagi dan yang tidak

Yang dibagi: sewa ruang display, biaya foto produk, dan jadwal jaga di akhir pekan. Yang tidak dibagi: harga, identitas, dan keputusan produk. Ini penting, karena kolaborasi yang mencampur identitas biasanya berakhir dengan salah satu pihak kehilangan pembeli setianya.

Kesepakatannya ditulis, bukan dibicarakan saja. Satu halaman, berisi pembagian biaya, siapa menjaga di hari apa, dan bagaimana keluar dari kesepakatan kalau tidak berjalan.

## Yang terjadi di tiga bulan pertama

Pengunjung yang datang untuk satu brand melihat brand yang lain. Itu memang harapannya, tapi yang tidak kami perkirakan adalah pertanyaan yang paling sering muncul: apakah keduanya satu perusahaan. Sejak itu, kami memasang keterangan yang jelas di rak bahwa ini dua usaha berbeda yang berbagi ruang.

Kejelasan itu ternyata menambah kepercayaan, bukan mengurangi.

## Kalau mau mencoba

Cari satu pihak yang pembelinya mirip tapi produknya tidak menggantikan produkmu. Mulai dari satu biaya bersama yang paling mudah dihitung, misalnya foto produk. Dan tulis kesepakatannya, meski partnernya teman dekat.`,
    isMock: true,
  },
];

/**
 * Returns partner stories, or an empty array. Empty means the section does not
 * render at all.
 */
export async function getPartnerStories(): Promise<PartnerStory[]> {
  if (!partnerStoriesEnabled()) return [];

  /*
   * No partner table exists yet. When one does, it is queried here and must
   * carry its own `is_mock` and consent fields. Until then the only source is
   * the development samples, which production drops.
   */
  if (!allowsMockContent()) return [];

  return DEV_SAMPLE;
}

/** One story by slug, for the advertorial page. */
export async function getPartnerStory(
  slug: string,
): Promise<PartnerStory | null> {
  const stories = await getPartnerStories();
  return stories.find((story) => story.slug === slug) ?? null;
}

/** Slugs for static generation. Empty in production while there is no content. */
export async function getPartnerSlugs(): Promise<string[]> {
  const stories = await getPartnerStories();
  return stories.map((story) => story.slug);
}
