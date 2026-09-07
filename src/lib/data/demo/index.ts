import { DEMO_ARTICLES_PART_ONE } from "@/lib/data/demo/articles-part-one";
import type { DemoArticleInput } from "@/lib/data/demo/articles-part-one";
import { DEMO_ARTICLES_PART_TWO } from "@/lib/data/demo/articles-part-two";
import { buildExcerpt, readingMinutes, renderMarkdown } from "@/lib/content";
import { normaliseProvenance } from "@/lib/content-environment";
import type {
  ArticleDetail,
  ArticleSummary,
  ContributionView,
  DirectoryListingView,
} from "@/lib/data/types";
import type { MediaProvenance } from "@/types/domain";

/**
 * Assembles the authored demo content into the same view models the Supabase
 * adapter returns, so pages cannot tell the difference.
 *
 * Every article produced here is `isMock: true` and every cover carries
 * `mock_visual` provenance. `lib/content-environment` drops mock items in
 * production and excludes them from every machine-readable surface.
 */

export const DEMO_ARTICLE_INPUTS: DemoArticleInput[] = [
  ...DEMO_ARTICLES_PART_ONE,
  ...DEMO_ARTICLES_PART_TWO,
];

/**
 * Provenance shared by every bundled cover. These files are development
 * placeholders: they do not document a location, a person, or an event, and
 * `normaliseProvenance` forces those flags false regardless of caller input.
 */
const MOCK_COVER_PROVENANCE: MediaProvenance = normaliseProvenance({
  sourceType: "mock_visual",
  credit: "Visual contoh · bukan dokumentasi",
});

/** Stable pseudo-UUID so demo ids look real and stay constant across renders. */
function demoId(slug: string, salt: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const input = `${salt}:${slug}`;
  for (let i = 0; i < input.length; i += 1) {
    h1 = (h1 ^ input.charCodeAt(i)) >>> 0;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 = (h2 + h1) >>> 0;
    h2 = Math.imul(h2, 2246822519) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const raw = `${hex(h1)}${hex(h2)}${hex(h1 ^ h2)}${hex((h1 + h2) >>> 0)}`;
  return [
    raw.slice(0, 8),
    raw.slice(8, 12),
    `4${raw.slice(13, 16)}`,
    `8${raw.slice(17, 20)}`,
    raw.slice(20, 32),
  ].join("-");
}

/**
 * Demo publish times are relative to a fixed epoch rather than `Date.now()`, so
 * server and client renders agree and nothing hydration-mismatches.
 */
const DEMO_EPOCH = Date.UTC(2026, 8, 4, 9, 0, 0);

function publishedAt(daysAgo: number): string {
  return new Date(DEMO_EPOCH - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

function toSummary(input: DemoArticleInput): ArticleSummary {
  const published = publishedAt(input.publishedDaysAgo);
  return {
    id: demoId(input.slug, "article"),
    title: input.title,
    slug: input.slug,
    dek: input.dek,
    excerpt: buildExcerpt(input.markdown),
    coverImageUrl: input.coverImageUrl ?? null,
    // Falls back to an explicit placeholder rather than inventing a description.
    coverImageAlt:
      input.coverImageAlt ?? "Visual contoh tanpa deskripsi gambar.",
    coverProvenance: input.coverImageUrl ? MOCK_COVER_PROVENANCE : null,
    pillar: input.pillar,
    tags: input.tags,
    status: "published",
    authorName: input.authorName,
    publishedAt: published,
    scheduledAt: null,
    updatedAt: published,
    createdAt: published,
    readingMinutes: readingMinutes(input.markdown),
    isSample: true,
    isMock: true,
    generatedByAi: false,
    counts: {
      view: input.counts.view,
      like: input.counts.like,
      save: input.counts.save,
      share: input.counts.share,
    },
  };
}

function toDetail(input: DemoArticleInput): ArticleDetail {
  const summary = toSummary(input);
  return {
    ...summary,
    contentMarkdown: input.markdown,
    contentHtml: renderMarkdown(input.markdown),
    // The reader-facing credit comes from provenance, not from a free-text field.
    coverImageCredit: null,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    primaryKeyword: input.primaryKeyword,
    secondaryKeywords: input.secondaryKeywords,
    aiProviderUsed: null,
    sourceRewriteJobId: null,
    sources: (input.sources ?? []).map((source, index) => ({
      id: demoId(`${input.slug}-${index}`, "source"),
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      attributionText: source.attributionText,
      sourceType: source.sourceType,
    })),
    images: [],
  };
}

export const DEMO_ARTICLE_SUMMARIES: ArticleSummary[] = DEMO_ARTICLE_INPUTS.map(
  toSummary,
).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

export const DEMO_ARTICLE_DETAILS: ArticleDetail[] =
  DEMO_ARTICLE_INPUTS.map(toDetail);

export function findDemoArticle(slug: string): ArticleDetail | null {
  return DEMO_ARTICLE_DETAILS.find((article) => article.slug === slug) ?? null;
}

export const DEMO_CONTRIBUTIONS: ContributionView[] = [
  {
    id: demoId("kopi-cipondoh", "contribution"),
    contributorName: "Rani (nama pena)",
    contributorContact: "rani.demo@example.com",
    title: "Warung kopi 24 jam di Cipondoh yang nolong anak skripsian",
    content:
      "Ada warung kopi kecil di Cipondoh yang buka 24 jam, kursinya cuma delapan, dan pemiliknya tidak pernah mengusir orang yang nongkrong lama. Saya ngerjain skripsi di situ tiga bulan. Kopi tubruknya lima ribu, colokan ada empat, wifi kadang mati tapi sinyal seluler kencang.",
    pillar: "vibes",
    location: "Cipondoh, Kota Tangerang",
    mediaUrls: [],
    consentPublish: true,
    consentEdit: true,
    status: "pending",
    moderationNote: null,
    reviewedAt: null,
    publishedArticleId: null,
    createdAt: publishedAt(1),
  },
  {
    id: demoId("kurir-serpong", "contribution"),
    contributorName: "Anonim",
    contributorContact: null,
    title: "Sehari jadi kurir di Serpong: 41 titik, 14 jam",
    content:
      "Saya kurir paket di area Serpong. Mau cerita satu hari kerja apa adanya. Mulai jam enam pagi di gudang, target 41 titik, selesai jam delapan malam. Yang bikin lama bukan jaraknya, tapi cluster yang satpamnya tidak mengizinkan masuk dan alamat yang ditulis asal.",
    pillar: "hustle",
    location: "Serpong, Tangerang Selatan",
    mediaUrls: [],
    consentPublish: true,
    consentEdit: true,
    status: "pending",
    moderationNote: null,
    reviewedAt: null,
    publishedArticleId: null,
    createdAt: publishedAt(2),
  },
  {
    id: demoId("sepeda-batuceper", "contribution"),
    contributorName: "Komunitas Sepeda Tangerang Utara",
    contributorContact: "wa: 08xx-demo-only",
    title: "Rute sepeda pagi yang masih aman dari truk kontainer",
    content:
      "Kami komunitas sepeda yang rutin gowes Sabtu pagi dari Batuceper. Setelah dua tahun coba banyak rute, kami punya tiga rute yang relatif aman dari truk kontainer sebelum jam tujuh. Kami mau bagi petanya dan titik yang harus dihindari.",
    pillar: "suara",
    location: "Batuceper, Kota Tangerang",
    mediaUrls: [],
    consentPublish: true,
    consentEdit: false,
    status: "pending",
    moderationNote: null,
    reviewedAt: null,
    publishedArticleId: null,
    createdAt: publishedAt(4),
  },
];

export const DEMO_DIRECTORY_LISTINGS: DirectoryListingView[] = [
  {
    id: demoId("barista", "listing"),
    type: "loker",
    title: "Barista (Sample listing)",
    description:
      "Shift pagi atau sore, 6 hari kerja. Tidak wajib pengalaman, pelatihan dua minggu. Contoh listing untuk pengembangan.",
    companyName: "Kedai contoh",
    contactInfo: "Contoh: kirim CV ke email redaksi",
    location: "Karawaci, Kota Tangerang",
    priceRange: "Rp 2,8 - 3,4 juta",
    externalUrl: null,
    isPaid: false,
    expiresAt: null,
    createdAt: publishedAt(2),
  },
  {
    id: demoId("admin-marketplace", "listing"),
    type: "loker",
    title: "Admin marketplace (Sample listing)",
    description:
      "Full time, WFO. Bisa Excel dasar dan balas chat pembeli dengan sabar. Contoh listing untuk pengembangan.",
    companyName: "UMKM contoh",
    contactInfo: "Contoh: DM Instagram",
    location: "Ciledug, Kota Tangerang",
    priceRange: "Rp 3,1 - 3,8 juta",
    externalUrl: null,
    isPaid: false,
    expiresAt: null,
    createdAt: publishedAt(3),
  },
  {
    id: demoId("laundry", "listing"),
    type: "umkm",
    title: "Laundry kiloan yang naik kelas (Sample)",
    description:
      "Contoh profil UMKM: dari satu mesin di garasi jadi tiga cabang dalam empat tahun.",
    companyName: "Laundry contoh",
    contactInfo: "Contoh kontak",
    location: "Pamulang, Tangerang Selatan",
    priceRange: "Rp 7 ribu/kg",
    externalUrl: null,
    isPaid: false,
    expiresAt: null,
    createdAt: publishedAt(6),
  },
  {
    id: demoId("kos-putri", "listing"),
    type: "kos",
    title: "Kos putri dekat kampus (Sample)",
    description:
      "Contoh data kos: kamar 3x4, kamar mandi dalam, listrik token, akses 24 jam.",
    companyName: null,
    contactInfo: "Contoh kontak",
    location: "Cikokol, Kota Tangerang",
    priceRange: "Rp 1,1 - 1,4 juta/bulan",
    externalUrl: null,
    isPaid: false,
    expiresAt: null,
    createdAt: publishedAt(8),
  },
  {
    id: demoId("pasar-kreatif", "listing"),
    type: "event",
    title: "Pasar kreatif akhir pekan (Sample)",
    description: "Contoh event: 40 tenant lokal, live music, gratis masuk.",
    companyName: null,
    contactInfo: "Contoh kontak",
    location: "Alam Sutera, Tangerang Selatan",
    priceRange: "Gratis",
    externalUrl: null,
    isPaid: false,
    expiresAt: null,
    createdAt: publishedAt(10),
  },
];
