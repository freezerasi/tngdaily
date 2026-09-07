import "server-only";

import { unstable_cache } from "next/cache";

/**
 * "Hari ini dalam arsip": notable events on today's date.
 *
 * Source is the Wikimedia on-this-day feed, which is real, dated, and citable.
 * Two integrity decisions:
 *
 *   1. Indonesian Wikipedia's feed returns empty payloads for every date, so the
 *      English feed is used and filtered for Indonesian relevance. Where a date
 *      has no Indonesian event, that is stated and world events are shown as
 *      world events, rather than dressing a global item up as local history.
 *
 *   2. Wikipedia text is CC BY-SA 4.0. Attribution and a link to the source page
 *      are mandatory, not decorative, so both are part of the returned data and
 *      the component cannot render an item without them.
 *
 * Nothing here is paraphrased or embellished: the summary is Wikipedia's own
 * sentence, trimmed, with its year and its link.
 */

export interface HistoricEvent {
  year: number;
  /** Wikipedia's own sentence. Not rewritten. */
  text: string;
  /** Canonical article for the event, for attribution and further reading. */
  sourceUrl: string | null;
  sourceTitle: string | null;
  /** True when the event concerns Indonesia. */
  isLocal: boolean;
}

export interface OnThisDayResult {
  /** Zero-padded month and day actually requested. */
  monthDay: string;
  dateLabel: string;
  events: HistoricEvent[];
  /**
   * True when at least one Indonesian event was found. When false the UI says
   * so plainly instead of implying local relevance.
   */
  hasLocalEvent: boolean;
  /** Null when the upstream is unavailable; the UI then shows an empty state. */
  attribution: string | null;
}

const WIKIMEDIA_TIMEOUT_MS = 1_200;
const WIKIMEDIA_CACHE_SECONDS = 21_600;

/*
 * Word-boundary anchored. An unanchored /bali/ matches "Baltimore", which is
 * exactly the kind of quiet false positive that would put an American baseball
 * record under a heading about Indonesian history.
 */
const INDONESIA_PATTERN = new RegExp(
  [
    "\\bindonesias?\\b",
    "\\bindonesian\\b",
    "\\bjakarta\\b",
    "\\bbatavia\\b",
    "\\bjava\\b",
    "\\bjavanese\\b",
    "\\bsumatra\\b",
    "\\bsulawesi\\b",
    "\\bbali\\b",
    "\\bbalinese\\b",
    "\\bborneo\\b",
    "\\bkalimantan\\b",
    "\\baceh\\b",
    "\\bpapua\\b",
    "\\bbanten\\b",
    "\\btangerang\\b",
    "\\bsurabaya\\b",
    "\\bbandung\\b",
    "\\byogyakarta\\b",
    "\\bmedan\\b",
    "\\bs(?:u|oe)karno\\b",
    "\\bs(?:u|oe)harto\\b",
    "\\bhabibie\\b",
    "\\bmajapahit\\b",
    "\\bsrivijaya\\b",
    "\\bkrakat(?:oa|au)\\b",
    "\\bdutch east indies\\b",
    "\\beast timor\\b",
    "\\btimor-leste\\b",
  ].join("|"),
  "i",
);

interface WikimediaPage {
  titles?: { normalized?: string };
  content_urls?: { desktop?: { page?: string } };
}

interface WikimediaEvent {
  year?: number;
  text?: string;
  pages?: WikimediaPage[];
}

interface WikimediaOnThisDay {
  selected?: WikimediaEvent[];
  events?: WikimediaEvent[];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function toHistoricEvent(raw: WikimediaEvent): HistoricEvent | null {
  const year = typeof raw.year === "number" ? raw.year : null;
  const rawText = raw.text?.trim();
  if (year === null || !rawText) return null;

  /*
   * Wikipedia writes "(pictured)" and "(depicted)" for the thumbnail shown in
   * its own feed. We do not render that image, so the aside is a dangling
   * reference to something the reader cannot see. Strip it and tidy the spacing.
   */
  const text = rawText
    .replace(/\s*\((?:pictured|depicted|illustrated)[^)]*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!text) return null;

  const page = raw.pages?.[0];

  return {
    year,
    text,
    sourceUrl: page?.content_urls?.desktop?.page ?? null,
    sourceTitle: page?.titles?.normalized ?? null,
    isLocal: INDONESIA_PATTERN.test(text),
  };
}

const getCachedOnThisDayEvents = unstable_cache(
  async (month: string, day: string, limit: number): Promise<HistoricEvent[]> => {
    try {
      const response = await fetch(
        `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${month}/${day}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            // Wikimedia asks for an identifying agent with a contact route.
            "Api-User-Agent":
              "TNGDaily/1.0 (https://tngdaily.com; editorial archive feature)",
          },
          signal: AbortSignal.timeout(WIKIMEDIA_TIMEOUT_MS),
        },
      );

      if (!response.ok) return [];

      const payload = (await response.json()) as WikimediaOnThisDay;

      // `selected` is Wikimedia's own editorial pick, so it leads.
      const raw = [...(payload.selected ?? []), ...(payload.events ?? [])];

      const seen = new Set<string>();
      const parsed: HistoricEvent[] = [];
      for (const item of raw) {
        const event = toHistoricEvent(item);
        if (!event) continue;

        /*
         * `selected` and `events` overlap heavily and describe the same incident in
         * different words, which would otherwise fill the panel with three
         * paraphrases of one event. Deduplicate on year plus the article the entry
         * points at, falling back to a text prefix when there is no page.
         */
        const key = event.sourceUrl
          ? `${event.year}:${event.sourceUrl}`
          : `${event.year}:${event.text.slice(0, 40).toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        parsed.push(event);
      }

      /*
       * Cap repeats of a single year. Wikipedia's feed frequently carries several
       * entries from one year, and three items all marked 2022 reads as a data bug
       * rather than as history.
       */
      const perYear = new Map<number, number>();
      const spread = parsed.filter((event) => {
        const count = perYear.get(event.year) ?? 0;
        if (count >= 1) return false;
        perYear.set(event.year, count + 1);
        return true;
      });

      const local = spread.filter((event) => event.isLocal);
      const global = spread.filter((event) => !event.isLocal);

      return [
        ...local.sort((a, b) => b.year - a.year),
        ...global.sort((a, b) => b.year - a.year),
      ].slice(0, limit);
    } catch {
      return [];
    }
  },
  ["wikimedia-on-this-day"],
  { revalidate: WIKIMEDIA_CACHE_SECONDS, tags: ["on-this-day"] },
);

/**
 * Events for today, Indonesian ones first.
 *
 * Cached for six hours: the answer only changes at midnight, and the feed is a
 * courtesy service that should not be hammered.
 */
export async function getOnThisDay(limit = 4): Promise<OnThisDayResult> {
  const now = new Date();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const monthDay = `${month}/${day}`;
  const dateLabel = `${now.getDate()} ${MONTHS_ID[now.getMonth()]}`;

  const empty: OnThisDayResult = {
    monthDay,
    dateLabel,
    events: [],
    hasLocalEvent: false,
    attribution: null,
  };

  const ordered = await getCachedOnThisDayEvents(month, day, limit);
    if (ordered.length === 0) return empty;

    return {
      monthDay,
      dateLabel,
      events: ordered,
      hasLocalEvent: ordered.some((event) => event.isLocal),
      attribution: "Wikipedia (CC BY-SA 4.0)",
    };
}
