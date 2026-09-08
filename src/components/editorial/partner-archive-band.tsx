import Link from "next/link";

import {
  ScribbleArrow,
  ScribbleBracket,
  ScribbleBurst,
  ScribbleRule,
  ScribbleStar,
} from "@/components/branding/scribble";
import { PartnerCard } from "@/components/editorial/partner-card";
import type { PartnerStory } from "@/lib/data/partners";
import type { OnThisDayResult } from "@/lib/data/on-this-day";
import { cn } from "@/lib/utils";

/**
 * A single band holding two unlike things: paid content and dated history.
 *
 * The pairing is deliberate rather than convenient. Both are outside the daily
 * news cycle: one is commercial, one is archival, and neither should be mistaken
 * for today's reporting. Putting them in one band, after the editorial feed,
 * draws a single clear line rather than two vague ones.
 *
 * Geometry, 12 columns on desktop:
 *   cols 1-9   Partner Stories, a three-up rail
 *   cols 10-12 "Hari Ini dalam Arsip", one tall column
 *
 * On mobile they stack into two rows, the partner rail becoming swipeable with
 * scroll snap, the archive column becoming a full-width stack. That rail and the
 * Radar carousel are the only horizontally scrolling regions on the site.
 */
export function PartnerAndArchiveBand({
  stories,
  archive,
}: {
  stories: PartnerStory[];
  archive: OnThisDayResult;
}) {
  const hasPartners = stories.length > 0;
  const hasArchive = archive.events.length > 0;

  // Nothing to show in either column: render nothing rather than an empty band.
  if (!hasPartners && !hasArchive) return null;

  return (
    <section
      aria-label="Partner stories dan arsip hari ini"
      className="border-t-2 border-keyline bg-wall-deep"
    >
      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-7 sm:px-4 lg:grid-cols-12 lg:items-stretch lg:gap-5">
        {hasPartners ? (
          <div
            className={cn(
              "flex h-full min-w-0 flex-col",
              hasArchive ? "lg:col-span-9" : "lg:col-span-12",
            )}
          >
            <PartnerRail stories={stories} />
          </div>
        ) : null}

        {hasArchive ? (
          <div
            className={cn(
              "flex h-full min-w-0 flex-col",
              hasPartners ? "lg:col-span-3" : "lg:col-span-12",
            )}
          >
            <ArchivePanel archive={archive} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export const PartnerStories = PartnerAndArchiveBand;

/* -------------------------------------------------------------------------- */
/* Partner rail: three up on desktop, swipeable on mobile                     */
/* -------------------------------------------------------------------------- */

function PartnerRail({ stories }: { stories: PartnerStory[] }) {
  const visible = stories.slice(0, 3);

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/partner"
            className="group inline-flex items-center gap-2 transition-colors hover:text-lime"
            title="Buka arsip Partner Stories"
          >
            <ScribbleBracket className="h-6 w-2.5 text-tape" side="left" />
            <h2 className="tng-display text-[1.25rem] leading-none sm:text-[1.5rem] group-hover:underline underline-offset-4 decoration-tape">
              PARTNER STORIES
            </h2>
            <ScribbleArrow className="h-3.5 text-tape transition-transform duration-200 group-hover:translate-x-1 group-hover:text-lime" />
          </Link>

          <span className="inline-flex items-center border border-tape/70 px-1.5 py-0.5 font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.14em] text-tape">
            BERSPONSOR
          </span>
        </div>

        <Link
          href="/partner"
          className="group inline-flex items-center gap-1.5 font-display text-[0.6875rem] font-extrabold uppercase tracking-wider text-tape transition-colors hover:text-lime"
        >
          Lihat Semua Arsip
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
        </Link>

        <p className="w-full text-[0.8125rem] leading-snug text-muted">
          Cerita kerja sama dari brand, UMKM, event, dan pelaku lokal.
        </p>
      </header>

      {/*
       * One list, two behaviours: snap rail below sm, three-column grid above.
       * Cards are 17rem on mobile so the second one peeks and the rail reads as
       * swipeable without an instruction. `items-stretch` plus `flex-1` lets the
       * cards fill the band's height, so the rail does not sit short beside the
       * taller archive column.
       */}
      <ul
        className={cn(
          // `min-w-0` again: the flex child must be allowed to shrink below its
          // content width, otherwise the rail cannot scroll and the page does.
          "flex min-w-0 flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:pb-0",
          "lg:grid-cols-3",
        )}
      >
        {visible.map((story, index) => (
          <li
            key={story.id}
            className="flex w-[17rem] shrink-0 snap-start sm:w-auto sm:shrink"
          >
            <PartnerCard story={story} index={index} className="w-full" />
          </li>
        ))}
      </ul>

      <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-muted sm:hidden">
        <ScribbleBracket className="h-4 w-2 text-tape" side="left" />
        Geser untuk melihat semua
        <ScribbleArrow className="h-2.5 text-tape" />
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Archive panel: today's date, in history                                    */
/* -------------------------------------------------------------------------- */

function ArchivePanel({ archive }: { archive: OnThisDayResult }) {
  const now = new Date();
  const dayNumber = now.getDate();
  const monthName = archive.dateLabel.split(" ").slice(1).join(" ");

  return (
    <aside
      aria-labelledby="archive-heading"
      className="flex h-full flex-col border-2 border-keyline bg-surface shadow-[var(--shadow-hard)]"
    >
      {/*
       * Torn calendar leaf. The day number is the largest thing in the panel and
       * the month hangs off it, so the date reads at a glance from across the
       * page rather than as a line of text.
       */}
      <div className="relative overflow-hidden border-b-2 border-keyline bg-lime px-3 pb-2.5 pt-3 text-ink">
        <span className="flex items-center gap-1.5">
          <ScribbleBurst className="size-3.5 text-ink/70" weight={0.9} />
          <span className="font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.18em] text-ink/75">
            HARI INI DALAM ARSIP
          </span>
        </span>

        <h2 id="archive-heading" className="mt-1 flex items-end gap-2">
          <span className="tng-display text-[3.25rem] leading-[0.78] text-ink">
            {dayNumber}
          </span>
          <span className="pb-1.5 font-display text-[0.875rem] font-extrabold uppercase leading-none tracking-[0.08em] text-ink/80">
            {monthName}
          </span>
        </h2>

        <ScribbleRule className="mt-1 h-1.5 w-16 text-ink/45" />
      </div>

      {/*
       * No framing paragraph: the per-entry INDONESIA or DUNIA mark already
       * tells a reader the scope of each item, in less space and closer to the
       * thing it describes.
       */}
      <ol className="flex flex-1 flex-col divide-y divide-dashed divide-line/70">
        {archive.events.map((event) => (
          <li key={`${event.year}-${event.text.slice(0, 24)}`} className="flex-1 p-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[1.25rem] font-black tabular-nums leading-none text-lime">
                {event.year}
              </span>
              {event.isLocal ? (
                <span className="inline-flex items-center gap-1 border border-lime/60 px-1 py-px font-display text-[0.5rem] font-extrabold uppercase tracking-[0.14em] text-lime">
                  <ScribbleStar className="size-2" weight={0.8} />
                  INDONESIA
                </span>
              ) : (
                <span className="inline-flex items-center border border-line px-1 py-px font-display text-[0.5rem] font-extrabold uppercase tracking-[0.14em] text-muted">
                  DUNIA
                </span>
              )}
            </div>

            <p className="mt-1.5 text-[0.8125rem] leading-snug text-foreground/85">
              {event.text}
            </p>

            {event.sourceUrl ? (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[0.625rem] text-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-lime"
              >
                {event.sourceTitle ?? "Sumber"}
                <ScribbleArrow className="h-2" />
              </a>
            ) : null}
          </li>
        ))}
      </ol>

      <Link
        href="/cari"
        className="mt-auto group flex items-center justify-between gap-2 border-t-2 border-line px-3 py-2.5 font-display text-[0.625rem] font-extrabold uppercase tracking-[0.12em] text-muted transition-colors hover:bg-surface-strong hover:text-lime"
      >
        TELUSURI ARSIP TNG
        <ScribbleArrow className="h-2.5 transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
    </aside>
  );
}
