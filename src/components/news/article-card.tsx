import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { ScribbleArrow, ScribbleQuote } from "@/components/branding/scribble";
import { Hem, ReadCost } from "@/components/shared/banner-parts";
import { MediaStatusBadge } from "@/components/shared/media-provenance";
import { TapePatch } from "@/components/shared/tape-patch";
import { ReactionBar } from "@/components/public/reaction-bar";
import { formatFeedTime } from "@/lib/dates";
import { articleUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { PILLAR_INK } from "@/lib/pillar-ink";
import { primaryTopic, TOPIC_META } from "@/lib/taxonomy";
import { PILLAR_META } from "@/types/domain";
import type { ArticleSummary } from "@/lib/data/types";
import type { ReactionType } from "@/types/domain";

/**
 * ArticleCard: one component, four densities.
 *
 * The banner world is kept as the material language (keyline, hard shadow, tape
 * patch, hem, stencil), but the geometry is now editorial: a photo does the
 * carrying and the type sits with it, rather than a tall colour field with a
 * headline floating in the middle.
 *
 *   lead     — hero left column, 16:9 cover, full metadata, reaction hem
 *   featured — spans two grid columns, cover with headline over a gradient
 *   standard — one column, cover on top, badge, title, excerpt, footer meta
 *   quote    — one column, no photo, pull-quote treatment for SUARA
 *   compact  — numbered list row for the hero's right rail
 */
export type ArticleCardVariant =
  | "lead"
  | "featured"
  | "standard"
  | "quote"
  | "compact";

interface BaseProps {
  article: ArticleSummary;
  className?: string;
}

export function ArticleCard({
  variant,
  ...props
}: BaseProps & {
  variant: ArticleCardVariant;
  priority?: boolean;
  index?: number;
  reactions?: Record<ReactionType, boolean>;
  locationLabel?: string;
}) {
  switch (variant) {
    case "lead":
      return <LeadCard {...props} />;
    case "featured":
      return <FeaturedCard {...props} />;
    case "quote":
      return <QuoteCard {...props} />;
    case "compact":
      return <CompactCard {...props} />;
    case "standard":
      return <StandardCard {...props} />;
  }
}

/* -------------------------------------------------------------------------- */
/* Shared parts                                                               */
/* -------------------------------------------------------------------------- */

/** Pillar badge: black plate, pillar-coloured text. Reads on any ground. */
function PillarBadge({
  article,
  size = "md",
}: {
  article: ArticleSummary;
  size?: "sm" | "md";
}) {
  const ink = PILLAR_INK[article.pillar];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border-2 border-keyline bg-ink font-display font-extrabold uppercase tracking-[0.12em]",
        ink.accentText,
        size === "sm"
          ? "px-1.5 py-0.5 text-[0.5625rem]"
          : "px-2 py-1 text-[0.625rem]",
      )}
    >
      {PILLAR_META[article.pillar].label}
    </span>
  );
}

/** Corner registration ticks: how a plate is aligned on press. */
function CornerTicks({ tone = "line" }: { tone?: "line" | "ink" }) {
  const colour = tone === "ink" ? "border-ink/45" : "border-line";
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      <span className={cn("absolute left-0 top-0 size-3 border-l-2 border-t-2", colour)} />
      <span className={cn("absolute right-0 top-0 size-3 border-r-2 border-t-2", colour)} />
      <span className={cn("absolute bottom-0 left-0 size-3 border-b-2 border-l-2", colour)} />
      <span className={cn("absolute bottom-0 right-0 size-3 border-b-2 border-r-2", colour)} />
    </span>
  );
}

function Cover({
  article,
  sizes,
  priority = false,
  className,
  locationLabel,
  overlay = false,
}: {
  article: ArticleSummary;
  sizes: string;
  priority?: boolean;
  className?: string;
  locationLabel?: string;
  overlay?: boolean;
}) {
  const ink = PILLAR_INK[article.pillar];
  const provenance = article.coverProvenance;

  /*
   * A location badge is a factual claim about the frame. It is only allowed when
   * provenance says the image actually depicts that place, which is never true
   * for an AI illustration or a development placeholder.
   */
  const showLocation = Boolean(
    locationLabel && provenance?.depictsActualLocation,
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden border-b-2 border-keyline bg-surface",
        className,
      )}
    >
      {article.coverImageUrl ? (
        <Image
          src={article.coverImageUrl}
          alt={article.coverImageAlt ?? `Ilustrasi untuk ${article.title}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        // No photo: the pillar's own material stands in, with its wordmark
        // sprayed through a stencil so the slot still reads as this section.
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            ink.panel === "lime" && "bg-lime",
            ink.panel === "orange" && "bg-orange",
            ink.panel === "bone" && "bg-bone",
            ink.panel === "wall" && "bg-surface-strong",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "tng-stencil text-center text-[1.75rem] leading-none",
              ink.onPanel === "ink" ? "text-ink/30" : "text-foreground/20",
            )}
          >
            {PILLAR_META[article.pillar].wordmark}
          </span>
        </span>
      )}

      {overlay ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-wall-deep via-wall-deep/55 to-transparent"
        />
      ) : null}

      {/* Status badge always sits on the frame, never behind hover. */}
      <MediaStatusBadge
        provenance={provenance}
        className="absolute left-2 top-2 z-10"
      />

      {showLocation ? (
        <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 border-2 border-keyline bg-ink/90 px-1.5 py-1 text-[0.625rem] font-semibold text-foreground backdrop-blur-[1px]">
          <MapPin aria-hidden="true" className="size-3 text-lime" strokeWidth={2.6} />
          {locationLabel}
        </span>
      ) : null}
    </div>
  );
}

function MetaRow({
  article,
  tone = "wall",
  className,
}: {
  article: ArticleSummary;
  tone?: "wall" | "ink";
  className?: string;
}) {
  const muted = tone === "ink" ? "text-ink/65" : "text-muted";
  // One curated topic, as metadata. The rubrik badge sits elsewhere on the card,
  // so a topic here reads as a subject rather than a second category.
  const topic = primaryTopic(article.tags);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.6875rem]",
        muted,
        className,
      )}
    >
      {article.authorName ? (
        <span className="truncate font-semibold">{article.authorName}</span>
      ) : null}
      <span aria-hidden="true" className="size-1 shrink-0 bg-current opacity-40" />
      <ReadCost minutes={article.readingMinutes} tone={tone === "ink" ? "ink" : "bone"} />
      <time
        dateTime={article.publishedAt ?? undefined}
        className="tabular-nums"
      >
        {formatFeedTime(article.publishedAt)}
      </time>
      {topic ? (
        <span
          className={cn(
            "border px-1.5 py-px font-body text-[0.625rem] font-semibold lowercase",
            tone === "ink" ? "border-ink/30" : "border-line",
          )}
        >
          {TOPIC_META[topic].label}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Lead: hero left column                                                     */
/* -------------------------------------------------------------------------- */

function LeadCard({
  article,
  priority = false,
  reactions,
  locationLabel,
  className,
}: BaseProps & {
  priority?: boolean;
  reactions?: Record<ReactionType, boolean>;
  locationLabel?: string;
}) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col border-2 border-keyline bg-surface shadow-[var(--shadow-hard)]",
        "transition-colors duration-200 ease-out hover:border-lime",
        className,
      )}
    >
      <CornerTicks />

      <div className="flex flex-wrap items-center gap-2 border-b-2 border-line px-3 py-2.5">
        <PillarBadge article={article} />
        <TapePatch tone="lime" tilt="left" size="sm">
          Liputan utama
        </TapePatch>
        <span className="ml-auto">
          <ReadCost minutes={article.readingMinutes} tone="bone" />
        </span>
      </div>

      <Link href={`/artikel/${article.slug}`} className="flex flex-1 flex-col">
        <Cover
          article={article}
          sizes="(min-width: 1024px) 760px, 100vw"
          priority={priority}
          className="aspect-[16/9] w-full shrink-0"
          {...(locationLabel ? { locationLabel } : {})}
        />

        <div className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
          <h2 className="tng-display text-[1.9rem] leading-[0.94] text-foreground transition-colors duration-200 group-hover:text-lime sm:text-[2.5rem] lg:text-[2.85rem]">
            {article.title}
          </h2>

          {article.dek ? (
            <p className="tng-measure text-[0.9375rem] leading-relaxed text-muted">
              {article.dek}
            </p>
          ) : null}

          <MetaRow article={article} className="mt-auto pt-1" />
        </div>
      </Link>

      <Hem className="shrink-0 border-line">
        <div className="flex items-center justify-between gap-2 px-3 pt-4 pb-2.5">
          <ReactionBar
            articleId={article.id}
            articleTitle={article.title}
            articleUrl={articleUrl(article.slug)}
            counts={{
              like: article.counts.like,
              save: article.counts.save,
              share: article.counts.share,
            }}
            active={reactions ?? { like: false, save: false, share: false }}
            tone="bone"
          />
          <Link
            href={`/artikel/${article.slug}`}
            className="tng-label group/cta inline-flex items-center gap-1.5 text-lime"
          >
            Baca ceritanya
            {/* Hand-drawn arrow: brand mark, not an icon-library glyph. */}
            <ScribbleArrow className="h-3 transition-transform duration-200 group-hover/cta:translate-x-1" />
          </Link>
        </div>
      </Hem>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Compact: numbered rail row                                                 */
/* -------------------------------------------------------------------------- */

function CompactCard({
  article,
  index = 0,
  className,
}: BaseProps & { index?: number }) {
  return (
    <article className={cn("group", className)}>
      <Link href={`/artikel/${article.slug}`} className="flex items-start gap-3 py-3">
        <span className="shrink-0 font-display text-[1.75rem] font-extrabold leading-none tabular-nums text-line transition-colors duration-200 group-hover:text-lime">
          {String(index + 1).padStart(2, "0")}
        </span>

        <span className="min-w-0 flex-1">
          <span className="mb-1.5 flex items-center gap-2">
            <PillarBadge article={article} size="sm" />
            <span className="tng-label text-[0.5625rem] text-muted">
              {article.readingMinutes} menit
            </span>
          </span>
          <h3 className="tng-display-tight text-[1.0625rem] leading-tight text-foreground transition-colors duration-200 group-hover:text-lime">
            {article.title}
          </h3>
          {article.dek ? (
            <p className="mt-1 line-clamp-2 text-[0.75rem] leading-snug text-muted">
              {article.dek}
            </p>
          ) : null}
        </span>

        <span className="relative size-20 shrink-0 overflow-hidden border-2 border-line transition-colors duration-200 group-hover:border-lime">
          <Cover
            article={article}
            sizes="80px"
            className="absolute inset-0 border-b-0"
          />
        </span>
      </Link>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Featured: two-column grid tile, headline over the photo                    */
/* -------------------------------------------------------------------------- */

function FeaturedCard({
  article,
  priority = false,
  className,
}: BaseProps & { priority?: boolean }) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col border-2 border-keyline bg-surface shadow-[var(--shadow-hard-sm)]",
        "transition-[border-color,transform,box-shadow] duration-200 ease-out",
        "hover:-translate-y-[2px] hover:border-lime hover:shadow-[var(--shadow-hard)]",
        className,
      )}
    >
      <Link href={`/artikel/${article.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/8]">
          <Cover
            article={article}
            sizes="(min-width: 1024px) 640px, 100vw"
            priority={priority}
            className="absolute inset-0 border-b-0"
            overlay
          />

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-3 sm:p-4">
            <span className="flex flex-wrap items-center gap-2">
              <PillarBadge article={article} size="sm" />
            </span>
            <h3 className="tng-display text-[1.5rem] leading-[0.96] text-foreground transition-colors duration-200 group-hover:text-lime sm:text-[2rem]">
              {article.title}
            </h3>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 border-t-2 border-line p-3">
          {article.dek ? (
            <p className="line-clamp-2 text-[0.8125rem] leading-relaxed text-muted">
              {article.dek}
            </p>
          ) : null}
          <MetaRow article={article} className="mt-auto" />
        </div>
      </Link>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Standard: single-column news tile                                          */
/* -------------------------------------------------------------------------- */

function StandardCard({ article, className }: BaseProps) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col border-2 border-keyline bg-surface shadow-[var(--shadow-hard-sm)]",
        "transition-[border-color,transform,box-shadow] duration-200 ease-out",
        "hover:-translate-y-[2px] hover:border-lime hover:shadow-[var(--shadow-hard)]",
        className,
      )}
    >
      <Link href={`/artikel/${article.slug}`} className="flex flex-1 flex-col">
        <Cover
          article={article}
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw"
          className="aspect-[16/10] w-full shrink-0"
        />

        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center bg-surface-strong border border-line px-2 py-0.5 font-display text-[0.625rem] font-extrabold uppercase tracking-wider text-foreground">
              {PILLAR_META[article.pillar].label}
            </span>
          </div>

          <h3 className="tng-display-tight line-clamp-2 text-[1.0625rem] font-extrabold uppercase leading-snug text-foreground transition-colors duration-200 group-hover:text-lime">
            {article.title}
          </h3>

          {article.dek ? (
            <p className="line-clamp-2 text-[0.8125rem] leading-snug text-muted">
              {article.dek}
            </p>
          ) : null}

          <div className="mt-auto border-t border-line/60 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
            {article.authorName ? article.authorName.toUpperCase() : "DRAFT"} &bull; {article.readingMinutes} MENIT BACA
          </div>
        </div>
      </Link>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Quote: text-only, for SUARA                                                */
/* -------------------------------------------------------------------------- */

function QuoteCard({ article, className }: BaseProps) {
  const topic = primaryTopic(article.tags);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col border-2 border-lime bg-wall-deep shadow-[var(--shadow-hard-sm)]",
        "transition-[transform,box-shadow] duration-200 ease-out",
        "hover:-translate-y-[2px] hover:shadow-[var(--shadow-hard)]",
        className,
      )}
    >
      <Link
        href={`/artikel/${article.slug}`}
        className="flex flex-1 flex-col justify-between p-4 sm:p-5"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex shrink-0 items-center bg-lime px-2 py-0.5 font-display text-[0.625rem] font-extrabold uppercase tracking-wider text-ink">
              {PILLAR_META[article.pillar].label}
            </span>
            {/*
             * Hand-drawn quote mark, not a typeset glyph. Sits opposite the
             * badge and clear of the headline, so it never competes with the
             * text it introduces.
             */}
            <ScribbleQuote className="-mt-1 h-8 w-11 shrink-0 text-lime/85" />
          </div>

          <h3 className="tng-display-tight mt-3 text-[1.25rem] font-extrabold uppercase leading-[1.1] text-foreground transition-colors duration-200 group-hover:text-lime sm:text-[1.375rem]">
            {article.title}
          </h3>

          {article.dek ? (
            <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-muted">
              {article.dek}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line/60 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
          <span>
            {article.authorName ? article.authorName.toUpperCase() : "DRAFT"}
          </span>
          <span aria-hidden="true" className="size-1 bg-current opacity-40" />
          <span>{article.readingMinutes} MENIT BACA</span>
          {topic ? (
            <span className="border border-line px-1.5 py-px font-body text-[0.625rem] font-semibold normal-case tracking-normal">
              {TOPIC_META[topic].label}
            </span>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

