import Image from "next/image";
import Link from "next/link";

import { ScribbleArrow, ScribbleBracket } from "@/components/branding/scribble";
import { formatDateShort } from "@/lib/dates";
import type { PartnerStory } from "@/lib/data/partners";
import { cn } from "@/lib/utils";

/**
 * PartnerCard: commercial content, structurally distinct from editorial.
 *
 * Editorial cards are dark plates with a photo on top and a lime accent. This is
 * inverted and rotated: a bone plate, a *ticket stub* geometry with a punched
 * left edge and a torn right edge, and the disclosure printed along the stub.
 * The layout itself is the signal, so the distinction survives even if a badge is
 * missed at a glance.
 *
 * Four independent markers, none of them load-bearing alone:
 *   1. the ADVERTORIAL · PARTNER plate, first in DOM order;
 *   2. the bone ground and the dashed keyline;
 *   3. the stub perforation running down the card;
 *   4. the `[Partner] × TNG Daily` byline where an author would sit.
 *
 * No pillar badge, no read-cost slot, no reaction bar: those belong to editorial
 * cards, and reusing them here would be the disguise.
 */
export function PartnerCard({
  story,
  index = 0,
  variant = "portrait",
  className,
}: {
  story: PartnerStory;
  /** Position in the rail, printed as a stub number. */
  index?: number;
  /** 'portrait' for vertical rail, 'semi-grid' for compact landscape grid. */
  variant?: "portrait" | "semi-grid";
  className?: string;
}) {
  const linkProps = story.isExternal
    ? { target: "_blank", rel: "sponsored nofollow noopener" }
    : { rel: "sponsored" };

  if (variant === "semi-grid") {
    return (
      <article
        className={cn(
          "group relative flex w-full overflow-hidden border-2 border-dashed border-tape bg-bone text-ink shadow-[var(--shadow-hard-sm)]",
          "transition-all duration-200 ease-out hover:border-solid hover:shadow-[var(--shadow-hard)]",
          className,
        )}
      >
        {/* Ticket stub: perforated spine carrying the disclosure vertically */}
        <div className="relative flex w-8 sm:w-9 shrink-0 flex-col items-center justify-between border-r-2 border-dashed border-ink/30 bg-ink py-2.5 sm:py-3.5">
          <span className="font-display text-[0.6875rem] font-black tabular-nums leading-none text-bone/70">
            {String(index + 1).padStart(2, "0")}
          </span>

          <span
            className="whitespace-nowrap font-display text-[0.5rem] font-extrabold uppercase tracking-[0.2em] text-lime"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            ADVERTORIAL &middot; PARTNER
          </span>

          <ScribbleBracket className="h-3.5 w-1.5 text-bone/50" side="left" />
        </div>

        <Link
          {...linkProps}
          href={story.href}
          className="flex min-w-0 flex-1 flex-col sm:flex-row"
        >
          {/* Landscape Thumbnail: 16:10 on mobile, responsive fixed width on sm+ */}
          {story.coverImageUrl ? (
            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b-2 border-dashed border-ink/20 sm:aspect-auto sm:w-48 md:w-52 lg:w-56 sm:border-b-0 sm:border-r-2">
              <Image
                src={story.coverImageUrl}
                alt={story.coverImageAlt ?? story.title}
                fill
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 210px, 100vw"
                className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
              />
              {story.isMock ? (
                <span className="absolute right-2 top-2 inline-flex items-center border border-ink bg-bone/95 px-1 py-0.5 font-display text-[0.5rem] font-extrabold uppercase tracking-wider text-ink">
                  CONTOH
                </span>
              ) : null}

              <span className="absolute bottom-2 left-2 inline-flex items-center border-2 border-ink bg-ink px-1.5 py-0.5 font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.14em] text-lime">
                {story.category}
              </span>
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[16/10] w-full shrink-0 border-b-2 border-dashed border-ink/20 sm:aspect-auto sm:w-48 md:w-52 lg:w-56 sm:border-b-0 sm:border-r-2"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(13,15,12,0.14) 0 3px, transparent 3px 11px)",
              }}
            />
          )}

          {/* Body Content */}
          <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
            <div>
              <span className="font-display text-[0.625rem] font-extrabold uppercase leading-tight tracking-[0.08em] text-ink/75">
                {story.partnerName} &times; TNG Daily
              </span>

              <h3 className="tng-display-tight mt-1 text-[1.0625rem] font-bold leading-snug text-ink transition-colors group-hover:text-ink sm:text-[1.125rem]">
                {story.title}
              </h3>

              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink/75 sm:text-[0.8125rem]">
                {story.dek}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink/25 pt-2">
              <time
                dateTime={story.publishedAt}
                className="text-[0.6875rem] tabular-nums text-ink/55"
              >
                {formatDateShort(story.publishedAt)}
              </time>

              <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-display text-[0.625rem] font-extrabold uppercase tracking-[0.1em] text-ink">
                BACA CERITA
                <ScribbleArrow className="h-2.5 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative flex h-full overflow-hidden border-2 border-dashed border-tape bg-bone text-ink",
        "transition-all duration-200 ease-out hover:border-solid hover:shadow-[var(--shadow-hard)]",
        className,
      )}
    >
      {/* Ticket stub: perforated spine carrying the disclosure vertically. */}
      <div className="relative flex w-9 shrink-0 flex-col items-center justify-between border-r-2 border-dashed border-ink/30 bg-ink py-2.5 sm:w-10">
        <span className="font-display text-[0.75rem] font-black tabular-nums leading-none text-bone/70">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Rotated disclosure. Real text, selectable, and read by a screen
            reader at its normal position in the flow. */}
        <span
          className="whitespace-nowrap font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.2em] text-lime"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          ADVERTORIAL &middot; PARTNER
        </span>

        <ScribbleBracket className="h-4 w-2 text-bone/50" side="left" />
      </div>

      <Link {...linkProps} href={story.href} className="flex min-w-0 flex-1 flex-col">
        {story.coverImageUrl ? (
          /*
           * 3:4 portrait. A 16:9 cover made these cards tall and thin beside the
           * archive column; a portrait plate fills the same column width with
           * less height, and the graphic plates are drawn on a 16:9 canvas so
           * `object-cover` crops to the centre where the mark sits.
           */
          <div className="relative aspect-[3/4] w-full overflow-hidden border-b-2 border-dashed border-ink/25">
            <Image
              src={story.coverImageUrl}
              alt={story.coverImageAlt ?? story.title}
              fill
              sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 80vw"
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
            {/* Development fixtures carry a visible marker, so a screenshot of
                the layout cannot read as a real paid placement. */}
            {story.isMock ? (
              <span className="absolute right-2 top-2 inline-flex items-center border-2 border-ink bg-bone/90 px-1.5 py-0.5 font-display text-[0.5rem] font-extrabold uppercase tracking-[0.14em] text-ink">
                CONTOH
              </span>
            ) : null}

            {/* Category sits on the plate rather than below it, which buys back
                a line of vertical space and anchors the badge to the image. */}
            <span className="absolute bottom-2 left-2 inline-flex items-center border-2 border-ink bg-ink px-1.5 py-0.5 font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.14em] text-lime">
              {story.category}
            </span>
          </div>
        ) : (
          // No cover: a hatched plate that cannot be mistaken for a photograph.
          <div
            aria-hidden="true"
            className="aspect-[3/4] w-full border-b-2 border-dashed border-ink/25"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(13,15,12,0.14) 0 3px, transparent 3px 11px)",
            }}
          />
        )}

        <div className="flex flex-1 flex-col justify-between gap-1.5 p-3">
          <div>
            <h3 className="tng-display-tight text-[1.0625rem] leading-tight text-ink sm:text-[1.125rem]">
              {story.title}
            </h3>

            <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-ink/70">
              {story.dek}
            </p>
          </div>

          <div className="mt-auto grid gap-1 border-t-2 border-dashed border-ink/25 pt-2">
            <span className="font-display text-[0.625rem] font-extrabold uppercase leading-tight tracking-[0.06em] text-ink">
              {story.partnerName} &times; TNG Daily
            </span>

            <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <time
                dateTime={story.publishedAt}
                className="text-[0.625rem] tabular-nums text-ink/55"
              >
                {formatDateShort(story.publishedAt)}
              </time>

              <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-display text-[0.625rem] font-extrabold uppercase tracking-[0.1em] text-ink">
                BACA
                <ScribbleArrow className="h-2.5 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
