import Link from "next/link";

import {
  ScribbleArrow,
  ScribbleBracket,
  ScribbleBurst,
  ScribbleCircle,
  ScribbleRule,
  ScribbleStar,
} from "@/components/branding/scribble";
import { formatFeedTime } from "@/lib/dates";
import type { RadarSlot } from "@/lib/data/radar";
import { cn } from "@/lib/utils";
import { PILLAR_META } from "@/types/domain";

/**
 * TNG Radar: "60 detik di Tangerang".
 *
 * Four practical slots, filled from directory listings and tag-matched articles.
 * A slot with no data says so plainly rather than showing invented practical
 * information, because a fabricated event listing is a fabricated fact.
 *
 * Responsive behaviour differs by intent, not by scale:
 *   - mobile is a snap carousel, the first card full width with the second
 *     peeking, so the row reads as scrollable without an instruction;
 *   - desktop is a four-column grid, all slots visible at once.
 *
 * This carousel and the rubrik filter bar are the only two horizontally
 * scrolling elements on the site.
 */

/** Each slot gets its own hand mark, so the four are told apart by drawing. */
const SLOT_MARKS = {
  event: ScribbleStar,
  transport: ScribbleArrow,
  kuliner: ScribbleCircle,
  kreator: ScribbleBurst,
} as const;

const LABELS: Record<string, string> = {
  event: "AGENDA",
  transport: "KOTA",
  kuliner: "KULINER",
  kreator: "KOMUNITAS",
};

export function RadarModule({ slots }: { slots: RadarSlot[] }) {
  return (
    <section
      aria-labelledby="radar-module-heading"
      className="border-y-2 border-keyline bg-surface py-6 sm:py-8"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex items-baseline gap-3">
            <span
              id="radar-module-heading"
              className="font-display text-[1.5rem] font-black uppercase tracking-tight text-lime sm:text-[1.75rem]"
            >
              TNG RADAR
            </span>
            <span className="font-display text-[0.875rem] font-bold uppercase tracking-widest text-foreground/80 sm:text-[1rem]">
              60 DETIK DI TANGERANG
            </span>
          </div>

          <span className="font-display text-[0.625rem] font-bold uppercase tracking-widest text-muted">
            INFO RINGKAS, KONTEKS LEBIH LUAS.
          </span>
        </div>

        {/* Hand-drawn rule rather than a flat 2px bar. */}
        <ScribbleRule className="my-3 h-2 w-full text-lime/90" weight={1.1} />

        {/*
         * One list, two behaviours. Mobile: snap carousel with a peeking second
         * card. From sm up: a plain grid, no scrolling, no snap.
         */}
        <ul
          className={cn(
            "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:pb-0",
            "lg:grid-cols-4",
          )}
        >
          {slots.map((slot) => (
            <li
              key={slot.key}
              className="w-[15rem] shrink-0 snap-start sm:w-auto sm:shrink"
            >
              <RadarCard slot={slot} />
            </li>
          ))}
        </ul>

        {/* Scroll affordance, mobile only. Bracket plus a short instruction. */}
        <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-muted sm:hidden">
          <ScribbleBracket className="h-4 w-2 text-lime" side="left" />
          Geser untuk melihat empat slot
          <ScribbleArrow className="h-2.5 text-lime" />
        </p>
      </div>
    </section>
  );
}

function RadarCard({ slot }: { slot: RadarSlot }) {
  const Mark = SLOT_MARKS[slot.key];
  const label = LABELS[slot.key] ?? slot.label.toUpperCase();
  const isEmpty = slot.item === null;

  return (
    <Link
      href={slot.href}
      className={cn(
        "group flex h-full min-h-[9rem] flex-col justify-between border-2 bg-wall-deep p-3.5 sm:p-4",
        "transition-all duration-150 ease-out",
        isEmpty
          ? "border-dashed border-line/70 hover:border-lime/70 hover:bg-surface"
          : "border-line hover:-translate-y-[2px] hover:border-lime hover:shadow-[var(--shadow-hard-sm)]",
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <Mark
            className={cn(
              "size-4 shrink-0 transition-colors duration-150",
              isEmpty ? "text-line" : "text-lime",
            )}
          />
          <span className="font-display text-[0.6875rem] font-extrabold uppercase tracking-wider text-muted group-hover:text-foreground">
            {label}
          </span>
        </div>

        {slot.item === null ? (
          <div className="mt-2.5">
            <h4 className="font-display text-[0.875rem] font-extrabold uppercase tracking-wide text-foreground">
              MENUNGGU UPDATE REDAKSI
            </h4>
            <p className="mt-1.5 text-[0.6875rem] leading-snug text-muted">
              Data akan muncul saat redaksi memiliki informasi terverifikasi.
            </p>
          </div>
        ) : slot.item.kind === "listing" ? (
          <div className="mt-2.5">
            <h4 className="tng-display-tight line-clamp-2 text-[0.9375rem] font-bold leading-tight text-foreground transition-colors group-hover:text-lime">
              {slot.item.listing.title}
            </h4>
            {slot.item.listing.location ? (
              <p className="mt-1 text-[0.6875rem] text-muted">
                {slot.item.listing.location}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-2.5">
            <h4 className="tng-display-tight line-clamp-2 text-[0.9375rem] font-bold leading-tight text-foreground transition-colors group-hover:text-lime">
              {slot.item.article.title}
            </h4>
            <p className="mt-1 text-[0.6875rem] text-muted">
              {PILLAR_META[slot.item.article.pillar].label} &bull;{" "}
              {formatFeedTime(slot.item.article.publishedAt)}
            </p>
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="mt-3 flex items-center justify-end border-t border-line/50 pt-2">
          <ScribbleArrow className="h-2.5 text-muted transition-all duration-150 group-hover:translate-x-1 group-hover:text-lime" />
        </div>
      )}
    </Link>
  );
}
