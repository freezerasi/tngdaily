import "server-only";

import { isProduction } from "@/lib/env";
import {
  MEDIA_SOURCE_TYPES,
  type MediaProvenance,
  type MediaSourceType,
} from "@/types/domain";

/**
 * Content environment and the production integrity gate.
 *
 * One rule, enforced in one place: anything flagged as mock is a development
 * fixture, and a development fixture must never reach a reader, a crawler, a
 * feed, or a structured-data graph in production.
 *
 * The gate is deliberately fail-closed. `isPublishable` asks whether an item may
 * be served, and in production the answer for a mock item is always no, whatever
 * the calling code believes.
 */

export type ContentEnvironment = "development" | "staging" | "production";

export function contentEnvironment(): ContentEnvironment {
  if (isProduction) return "production";
  // Vercel preview deployments are staging: mock content is allowed so the
  // layout can be reviewed, but it stays labelled.
  if (process.env.VERCEL_ENV === "preview") return "staging";
  return "development";
}

/** True only where labelled placeholder content may be rendered. */
export function allowsMockContent(): boolean {
  return contentEnvironment() !== "production";
}

/**
 * Anything that can carry the mock flag. Deliberately structural rather than
 * tied to `ArticleSummary`, so directory listings, radar slots, and images all
 * pass through the same gate.
 */
export interface MockFlagged {
  isMock: boolean;
}

/**
 * The single production filter. Returns false for mock items in production, so
 * a caller cannot leak one by forgetting a check.
 */
export function isPublishable(item: MockFlagged): boolean {
  if (!item.isMock) return true;
  return allowsMockContent();
}

/** Drops mock items in production, keeps them elsewhere. */
export function filterPublishable<T extends MockFlagged>(items: T[]): T[] {
  if (allowsMockContent()) return items;
  return items.filter((item) => !item.isMock);
}

/**
 * Stricter gate for machine-readable surfaces: sitemap, RSS, JSON-LD, Open
 * Graph, and any search index. Mock content is excluded from these in *every*
 * environment, not just production, because a staging URL that gets crawled or
 * shared carries the same false claim as a production one.
 */
export function isIndexable(item: MockFlagged): boolean {
  return !item.isMock;
}

export function filterIndexable<T extends MockFlagged>(items: T[]): T[] {
  return items.filter((item) => !item.isMock);
}

/* -------------------------------------------------------------------------- */
/* Provenance rules                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Source types that can never be presented as evidence of a real place or
 * event, whatever the surrounding copy says.
 */
const NON_EVIDENTIARY: readonly MediaSourceType[] = [
  "ai_illustration",
  "mock_visual",
];

export function isEvidentiary(provenance: MediaProvenance): boolean {
  return !NON_EVIDENTIARY.includes(provenance.sourceType);
}

/** True when the UI must show a visible status badge over the frame. */
export function needsVisibleBadge(provenance: MediaProvenance): boolean {
  return NON_EVIDENTIARY.includes(provenance.sourceType);
}

/** Short badge text drawn on the image itself. */
export function badgeLabel(provenance: MediaProvenance): string | null {
  switch (provenance.sourceType) {
    case "mock_visual":
      return "VISUAL CONTOH";
    case "ai_illustration":
      return "ILUSTRASI AI";
    default:
      return null;
  }
}

/**
 * Normalises a provenance record and repairs impossible combinations rather than
 * trusting them. An AI illustration or a mock visual cannot depict an actual
 * location or event, so those flags are forced false even if a caller set them.
 */
export function normaliseProvenance(
  input: Partial<MediaProvenance> & { sourceType: MediaSourceType },
): MediaProvenance {
  const sourceType = MEDIA_SOURCE_TYPES.includes(input.sourceType)
    ? input.sourceType
    : "mock_visual";

  const evidentiary = !NON_EVIDENTIARY.includes(sourceType);

  return {
    sourceType,
    credit: input.credit ?? defaultCredit(sourceType),
    isIllustrative: evidentiary ? (input.isIllustrative ?? false) : true,
    depictsActualLocation: evidentiary
      ? (input.depictsActualLocation ?? false)
      : false,
    depictsActualEvent: evidentiary ? (input.depictsActualEvent ?? false) : false,
    disclosure: input.disclosure ?? defaultDisclosure(sourceType),
  };
}

function defaultCredit(sourceType: MediaSourceType): string {
  switch (sourceType) {
    case "mock_visual":
      return "Visual contoh · bukan dokumentasi";
    case "ai_illustration":
      return "Ilustrasi AI · TNG Daily";
    case "editorial_graphic":
      return "Grafik · TNG Daily";
    default:
      return "Kredit belum dilengkapi";
  }
}

function defaultDisclosure(sourceType: MediaSourceType): string | null {
  switch (sourceType) {
    case "mock_visual":
      return "Visual contoh untuk pengembangan tampilan. Gambar ini bukan dokumentasi lokasi, orang, atau peristiwa mana pun, dan tidak tayang di versi produksi.";
    case "ai_illustration":
      return "Ilustrasi AI untuk TNG Daily. Visual ini bukan dokumentasi foto lokasi, orang, atau peristiwa aktual.";
    default:
      return null;
  }
}
