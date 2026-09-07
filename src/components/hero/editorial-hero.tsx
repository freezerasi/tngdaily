import Image from "next/image";
import Link from "next/link";

import {
  ScribbleArrow,
  ScribbleCircle,
  ScribbleRule,
} from "@/components/branding/scribble";
import { MediaStatusBadge } from "@/components/shared/media-provenance";
import type { ArticleSummary } from "@/lib/data/types";
import { PILLAR_META } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * EditorialHero: asymmetric 7/5 editorial split.
 *
 * Left, the lead story: a 16:9 cover carrying the weight, then an attached lime
 * panel holding the rubrik badge, the PILIHAN REDAKSI mark, the headline, the
 * dek, and one CTA. The photo does the work, so the panel never becomes a tall
 * empty colour field.
 *
 * Right, PILIHAN HARI INI: three numbered picks with thumbnails, separated by
 * dashed rules, sized to match the lead column's height on desktop so the row
 * has no void under it.
 *
 * Scribble budget for this section is two marks: one ring on the context plate,
 * one arrow on the CTA. Nothing sits over the headline.
 *
 * A partner or advertorial item can never appear here. This component reads
 * `ArticleSummary`, and partner content is a separate type by design.
 */
export function EditorialHero({
  lead,
  radar,
  leadLocation,
}: {
  lead: ArticleSummary;
  radar: ArticleSummary[];
  leadLocation?: string;
}) {
  const choices = radar.slice(0, 3);

  return (
    <section aria-labelledby="hero-heading" className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
      <h2 id="hero-heading" className="sr-only">
        Sorotan Utama Hari Ini
      </h2>

      {/* Left Column: Big Lead Story (7 cols on lg) */}
      <div className="lg:col-span-7 xl:col-span-7">
        <article className="group flex h-full flex-col border-2 border-keyline bg-surface shadow-[var(--shadow-hard)] transition-all duration-200">
          <Link
            href={`/artikel/${lead.slug}`}
            className="flex flex-1 flex-col"
          >
            {/* Cover Image with controlled proportional height */}
            <div className="relative h-[240px] w-full overflow-hidden border-b-2 border-keyline bg-surface-strong sm:h-[300px] lg:h-[290px] xl:h-[310px]">
              {lead.coverImageUrl ? (
                <Image
                  src={lead.coverImageUrl}
                  alt={lead.coverImageAlt ?? lead.title}
                  fill
                  priority
                  sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-surface-strong text-muted">
                  TNG DAILY
                </div>
              )}

              {/*
                * Two separate claims, kept separate:
                *   - the status badge says what the frame is;
                *   - the location badge says where it was taken, and only
                *     renders when provenance confirms the frame depicts it.
                */}
              <span className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
                <MediaStatusBadge provenance={lead.coverProvenance} />
                {leadLocation && lead.coverProvenance?.depictsActualLocation ? (
                  <span className="inline-flex items-center border border-white/20 bg-black/80 px-2 py-0.5 font-display text-[0.625rem] font-bold uppercase tracking-wider text-white backdrop-blur-[2px]">
                    {leadLocation}
                  </span>
                ) : null}
              </span>
            </div>

            {/* Attached Neon Lime Bottom Panel */}
            <div className="relative flex flex-1 flex-col justify-between bg-lime p-4 text-ink sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-col gap-2">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center bg-ink px-2 py-0.5 font-display text-[0.625rem] font-extrabold uppercase tracking-wider text-white">
                      {PILLAR_META[lead.pillar].label}
                    </span>
                    <span className="inline-flex items-center border border-ink/80 px-2 py-0.5 font-display text-[0.625rem] font-extrabold uppercase tracking-wider text-ink">
                      PILIHAN REDAKSI
                    </span>
                  </div>

                  {/* Monumental Headline. Deliberately clear of any scribble:
                      the largest type on the page carries no decoration. */}
                  <h3 className="tng-display text-[1.625rem] leading-[0.92] text-ink transition-colors sm:text-[2rem] lg:text-[2.25rem]">
                    {lead.title}
                  </h3>

                  {/* Excerpt / Dek */}
                  {lead.dek ? (
                    <p className="line-clamp-2 max-w-2xl text-[0.8125rem] font-medium leading-relaxed text-ink/85 sm:text-[0.875rem]">
                      {lead.dek}
                    </p>
                  ) : null}
                </div>

                {/* Context plate: the label ringed by hand. One mark for this
                    whole column. The ring draws over the panel, not behind it:
                    `-z-10` would put it under the lime ground and vanish. */}
                <div className="relative hidden shrink-0 flex-col items-center justify-center border-l border-ink/30 pl-4 sm:flex">
                  <span className="relative inline-block px-1.5 py-1 text-center font-display text-[0.625rem] font-extrabold uppercase leading-tight tracking-wider text-ink">
                    KONTEKS
                    <br />
                    LOKAL
                    <ScribbleCircle
                      className="pointer-events-none absolute -inset-x-2.5 -inset-y-1.5 text-ink/45"
                      weight={0.75}
                    />
                  </span>
                </div>
              </div>

              {/* Bottom meta and the single CTA for this panel. Wraps rather
                  than compressing the byline at 360px. */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-ink/25 pt-2 text-[0.6875rem] font-bold uppercase tracking-wider text-ink/75">
                <span className="whitespace-nowrap">
                  {lead.authorName ? lead.authorName.toUpperCase() : "DRAFT REDAKSI"} &bull;{" "}
                  {lead.readingMinutes} MENIT
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-ink">
                  BACA CERITANYA
                  <ScribbleArrow className="h-3 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        </article>
      </div>

      {/* Right Column: "PILIHAN HARI INI" (5 cols on lg) */}
      <aside className="flex flex-col justify-between border-2 border-keyline bg-wall-deep p-4 shadow-[var(--shadow-hard)] lg:col-span-5 xl:col-span-5">
        {/*
         * Header wraps at narrow widths rather than letting the heading and the
         * standfirst collide. The standfirst drops below sm, where it competes
         * with the heading for a single line.
         */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[1.0625rem] font-extrabold uppercase tracking-wide text-foreground">
              PILIHAN HARI INI
            </h3>
            <ScribbleRule className="h-1.5 w-7 text-lime" weight={1.2} />
          </div>
          <span className="hidden font-display text-[0.5625rem] font-bold uppercase tracking-widest text-muted sm:inline">
            CERITA PILIHAN DARI REDAKSI
          </span>
        </div>

        {/* 3 Numbered Editorial Items (01, 02, 03) */}
        {/* Dashed rules between picks: an editorial separator, not a table row. */}
        <div className="flex flex-1 flex-col justify-between divide-y divide-dashed divide-line/70">
          {choices.map((article, index) => {
            return (
              <article key={article.id} className="group flex flex-1 items-center py-3">
                <Link
                  href={`/artikel/${article.slug}`}
                  className="flex w-full items-center gap-3"
                >
                  {/* Big Number */}
                  <span className="w-10 shrink-0 font-display text-[2rem] font-extrabold leading-none tabular-nums text-line transition-colors duration-200 group-hover:text-lime sm:text-[2.25rem]">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Thumbnail Image */}
                  <div className="relative h-18 w-24 shrink-0 overflow-hidden border border-line bg-surface transition-colors group-hover:border-lime sm:h-20 sm:w-28">
                    {article.coverImageUrl ? (
                      <Image
                        src={article.coverImageUrl}
                        alt={article.coverImageAlt ?? article.title}
                        fill
                        sizes="120px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-surface text-[0.625rem] font-bold uppercase text-muted">
                        {article.pillar}
                      </div>
                    )}
                  </div>

                  {/* Info: Badge, Title, Meta */}
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "inline-block px-1.5 py-0.5 font-display text-[0.5625rem] font-extrabold uppercase tracking-wider",
                        article.pillar === "vibes"
                          ? "bg-lime text-ink"
                          : article.pillar === "hustle"
                            ? "bg-lime text-ink"
                            : "border border-line bg-surface-strong text-foreground",
                      )}
                    >
                      {PILLAR_META[article.pillar].label}
                    </span>

                    <h4 className="tng-display-tight mt-1 line-clamp-2 text-[0.9375rem] font-extrabold uppercase leading-snug text-foreground transition-colors group-hover:text-lime">
                      {article.title}
                    </h4>

                    <span className="mt-1 block text-[0.625rem] font-semibold uppercase tracking-wider text-muted">
                      DRAFT &bull; {article.readingMinutes} MENIT
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </aside>
    </section>
  );
}

