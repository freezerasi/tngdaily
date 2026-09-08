import "server-only";

import { getPublishedArticles } from "@/lib/data/articles";
import { getDirectoryListings } from "@/lib/data/directory";
import type { ArticleSummary, DirectoryListingView } from "@/lib/data/types";

/**
 * TNG Radar: four practical slots for the "60 detik di Tangerang" module.
 *
 * Every slot is filled from data we own: directory listings for events, and
 * tag-matched published articles for the rest. A slot with no matching data
 * renders an honest empty state rather than authored filler, because filler in
 * a practical-info module is a factual claim.
 */

export interface RadarSlot {
  key: "event" | "transport" | "kuliner" | "kreator";
  label: string;
  /** What this slot promises the reader. */
  blurb: string;
  /** Resolved content, or null when nothing matches yet. */
  item:
    | { kind: "listing"; listing: DirectoryListingView }
    | { kind: "article"; article: ArticleSummary }
    | null;
  href: string;
  emptyHint: string;
}

const TRANSPORT_TAGS = ["transportasi", "angkot", "commute", "trotoar"];
const FOOD_TAGS = ["kuliner", "kopi", "nongkrong", "pagi"];
const CREATOR_TAGS = ["kreator", "komunitas", "musik", "cerita"];

function pickByTags(
  articles: ArticleSummary[],
  tags: readonly string[],
  used: Set<string>,
): ArticleSummary | null {
  const match = articles.find(
    (article) =>
      !used.has(article.id) && article.tags.some((tag) => tags.includes(tag)),
  );
  if (match) {
    used.add(match.id);
    return match;
  }
  return null;
}

interface RadarQuery {
  /**
   * Homepage already loads the feed. Reusing it avoids a second public article
   * query during the critical render path.
   */
  articles?: ArticleSummary[];
}

export async function getRadarSlots(query: RadarQuery = {}): Promise<RadarSlot[]> {
  const [articles, listingsResult] = await Promise.all([
    query.articles
      ? Promise.resolve(query.articles)
      : getPublishedArticles({ limit: 24 }).then((result) => result.data.items),
    getDirectoryListings(12),
  ]);

  const listings = listingsResult.data;
  const used = new Set<string>();

  const event = listings.find((listing) => listing.type === "event") ?? null;

  const transport = pickByTags(articles, TRANSPORT_TAGS, used);
  const kuliner = pickByTags(articles, FOOD_TAGS, used);
  const kreator = pickByTags(articles, CREATOR_TAGS, used);

  return [
    {
      key: "event",
      label: "Akhir pekan ini",
      blurb: "Event dan pasar kreatif di Tangerang Raya",
      item: event ? { kind: "listing", listing: event } : null,
      href: "/hustle",
      emptyHint:
        "Belum ada event terdaftar. Redaksi menambahkannya dari papan direktori.",
    },
    {
      key: "transport",
      label: "Jalan dan transportasi",
      blurb: "Angkot, KRL, trotoar, dan rute harian",
      item: transport ? { kind: "article", article: transport } : null,
      href: "/suara/tag/transportasi",
      emptyHint: "Belum ada liputan transportasi yang tayang.",
    },
    {
      key: "kuliner",
      label: "Makan dan nongkrong",
      blurb: "Tempat yang masih longgar dan harganya jujur",
      item: kuliner ? { kind: "article", article: kuliner } : null,
      href: "/vibes/tag/kuliner",
      emptyHint: "Belum ada liputan kuliner yang tayang.",
    },
    {
      key: "kreator",
      label: "Orang dan komunitas",
      blurb: "Kreator, skena, dan cerita warga",
      item: kreator ? { kind: "article", article: kreator } : null,
      href: "/story",
      emptyHint: "Belum ada cerita komunitas yang tayang.",
    },
  ];
}
