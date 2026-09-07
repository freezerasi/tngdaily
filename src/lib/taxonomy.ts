import type { Pillar } from "@/types/domain";

/**
 * Taxonomy: one primary rubrik per article, many topic tags.
 *
 * These are two different things and the UI must not blur them:
 *
 *   Rubrik (pillar) — the desk that owns the story. Exactly one per article,
 *   drives the URL, the navigation, the filter bar, and the card badge. A finite
 *   editorial structure, changed only by a deliberate decision.
 *
 *   Tag (topik) — what the story is about. Many per article, never in the main
 *   navigation or the primary filter, shown as card and article metadata and
 *   usable as a secondary filter inside a rubrik.
 *
 * The failure this prevents: a reader seeing KULINER beside VIBES in the same
 * filter row and reasonably concluding they are peers, when one is a section and
 * the other is a subject.
 */

/* -------------------------------------------------------------------------- */
/* Curated topics                                                             */
/* -------------------------------------------------------------------------- */

export const TOPICS = [
  "kuliner",
  "komunitas",
  "kota",
  "agenda",
  "karier",
] as const;
export type Topic = (typeof TOPICS)[number];

export interface TopicMeta {
  readonly slug: Topic;
  readonly label: string;
  /** Rubriks where this topic normally appears. Guidance, not a constraint. */
  readonly commonIn: readonly Pillar[];
  readonly description: string;
}

export const TOPIC_META: Record<Topic, TopicMeta> = {
  kuliner: {
    slug: "kuliner",
    label: "Kuliner",
    commonIn: ["vibes", "hustle"],
    description: "Makan, kopi, warung, dan harga yang sebenarnya.",
  },
  komunitas: {
    slug: "komunitas",
    label: "Komunitas",
    commonIn: ["story", "vibes"],
    description: "Kelompok, skena, dan ruang bersama.",
  },
  kota: {
    slug: "kota",
    label: "Kota",
    commonIn: ["suara"],
    description: "Transportasi, trotoar, ruang publik, kebijakan.",
  },
  agenda: {
    slug: "agenda",
    label: "Agenda",
    commonIn: ["vibes", "hustle"],
    description: "Event, pasar kreatif, dan jadwal akhir pekan.",
  },
  karier: {
    slug: "karier",
    label: "Karier",
    commonIn: ["hustle"],
    description: "Loker, gaji, side hustle, biaya hidup.",
  },
};

export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && (TOPICS as readonly string[]).includes(value);
}

/**
 * Maps the free-form tags an editor types onto curated topics.
 *
 * Free tags stay useful for search and long-tail filtering; curated topics are
 * what the UI promotes. Keeping the mapping here means an editor never has to
 * remember a controlled vocabulary while writing.
 */
const TAG_TO_TOPIC: Record<string, Topic> = {
  // kuliner
  kuliner: "kuliner",
  kopi: "kuliner",
  nongkrong: "kuliner",
  warung: "kuliner",
  sarapan: "kuliner",
  "pasar lama": "kuliner",
  pagi: "kuliner",
  // komunitas
  komunitas: "komunitas",
  cerita: "komunitas",
  kreator: "komunitas",
  musik: "komunitas",
  warnet: "komunitas",
  // kota
  kota: "kota",
  transportasi: "kota",
  angkot: "kota",
  trotoar: "kota",
  commute: "kota",
  "ruang kota": "kota",
  "ruang publik": "kota",
  "pejalan kaki": "kota",
  // agenda
  agenda: "agenda",
  event: "agenda",
  sore: "agenda",
  // karier
  karier: "karier",
  loker: "karier",
  gaji: "karier",
  "biaya hidup": "karier",
  kos: "karier",
  "side hustle": "karier",
  "fresh graduate": "karier",
  umkm: "karier",
  "modal kecil": "karier",
  cetak: "karier",
};

/** Curated topics for an article, in the order they were tagged. */
export function topicsForTags(tags: readonly string[]): Topic[] {
  const found: Topic[] = [];
  for (const tag of tags) {
    const topic = TAG_TO_TOPIC[tag.trim().toLowerCase()];
    if (topic && !found.includes(topic)) found.push(topic);
  }
  return found;
}

/**
 * The single topic to show as card metadata. Cards have room for one, and one
 * accurate topic beats three competing for the same line.
 */
export function primaryTopic(tags: readonly string[]): Topic | null {
  return topicsForTags(tags)[0] ?? null;
}

/** Free tags that did not map to a curated topic, for the article page. */
export function looseTagsFor(tags: readonly string[]): string[] {
  return tags.filter((tag) => !TAG_TO_TOPIC[tag.trim().toLowerCase()]);
}
