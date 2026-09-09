import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { BannerPanel } from "@/components/shared/banner-panel";
import { Hem, ReadCost } from "@/components/shared/banner-parts";
import { TapePatch } from "@/components/shared/tape-patch";
import { ReactionBar } from "@/components/public/reaction-bar";
import { formatFeedTime } from "@/lib/dates";
import { articleUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { PILLAR_INK, onPanelText } from "@/lib/pillar-ink";
import { PILLAR_META } from "@/types/domain";
import type { ArticleSummary } from "@/lib/data/types";
import type { ReactionType } from "@/types/domain";

/**
 * FeedCard: one banner hung on the wall.
 *
 * Rank is carried by the wall reserve around the panel and by headline scale.
 * The reaction bar lives in the bottom hem, always at the same height, so the
 * thumb never hunts for it.
 */
export function FeedCard({
  article,
  rank,
  priority = false,
  reactions,
  showSwipeHint = false,
}: {
  article: ArticleSummary;
  rank: "lead" | "standard";
  priority?: boolean;
  reactions?: Record<ReactionType, boolean>;
  showSwipeHint?: boolean;
}) {
  const ink = PILLAR_INK[article.pillar];
  const text = onPanelText(article.pillar);
  const href = `/artikel/${article.slug}`;
  const isLead = rank === "lead";

  return (
    <BannerPanel
      as="article"
      ink={ink.panel}
      lift="lg"
      reserve={isLead ? "sm" : "md"}
      tilt={isLead ? "none" : "left"}
      grommets
      grommetInset="0.5rem"
      className={cn(
        "flex flex-col overflow-hidden",
        // Mobile leans on viewport height so one banner fills the screen.
        // Desktop caps it: a 72svh panel at 1440 leaves a void, and reserve is
        // expressed by the wall around the panel, not by dead space inside it.
        isLead
          ? "min-h-[clamp(30rem,72svh,44rem)] lg:min-h-[33rem]"
          : "min-h-[clamp(26rem,64svh,40rem)] lg:min-h-[29rem]",
      )}
    >
      {/* Top hem carries the pillar patch and the fixed read-cost slot. */}
      <Hem edge="top" className={cn("shrink-0", text.rule)}>
        <div className="flex items-center gap-2 px-3 py-3 pt-4">
          <TapePatch tone={ink.patch} tilt="left">
            {PILLAR_META[article.pillar].label}
          </TapePatch>
          {article.isSample ? (
            <TapePatch tone="tape" tilt="right" size="sm">
              Contoh
            </TapePatch>
          ) : null}
          <span className="ml-auto flex items-center gap-2.5">
            <time
              dateTime={article.publishedAt ?? undefined}
              className={cn("tng-label text-[0.5625rem]", text.muted)}
            >
              {formatFeedTime(article.publishedAt)}
            </time>
            <ReadCost
              minutes={article.readingMinutes}
              tone={ink.onPanel === "ink" ? "ink" : "bone"}
            />
          </span>
        </div>
      </Hem>

      {/* Cover: real image when present, otherwise the panel's own material. */}
      {article.coverImageUrl ? (
        <div className="relative aspect-[16/10] w-full shrink-0 border-b-2 border-keyline">
          <CloudinaryImage
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? `Ilustrasi untuk ${article.title}`}
            sizes="(min-width: 1024px) 640px, 100vw"
            eager={priority}
          />
        </div>
      ) : null}

      <Link
        href={href}
        className="group relative flex flex-1 flex-col justify-end gap-3 px-3 py-5 outline-none"
      >
        {/* The banner's own field mark: the pillar wordmark sprayed through a
            stencil, large enough to read as material rather than as a label. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-3 top-3 select-none",
            "tng-stencil leading-[0.82] tracking-[0.02em]",
            isLead ? "text-[3.5rem] sm:text-[4.75rem]" : "text-[2.75rem] sm:text-[3.5rem]",
            ink.onPanel === "ink" ? "text-ink/22" : "text-foreground/12",
          )}
        >
          {PILLAR_META[article.pillar].wordmark}
        </span>

        <h2
          className={cn(
            "tng-display relative",
            text.heading,
            isLead
              ? "text-[2.35rem] sm:text-[3rem] lg:text-[3.5rem]"
              : "text-[1.9rem] sm:text-[2.4rem]",
            "group-hover:underline group-hover:decoration-[3px] group-hover:underline-offset-[6px]",
            "group-focus-visible:underline group-focus-visible:decoration-[3px]",
          )}
          style={{ textWrap: "balance" }}
        >
          {article.title}
        </h2>

        {article.dek ? (
          <p
            className={cn(
              "tng-measure relative text-[0.9375rem] leading-relaxed sm:text-base",
              text.body,
            )}
          >
            {article.dek}
          </p>
        ) : null}

        <span
          className={cn(
            "tng-label relative inline-flex items-center gap-1.5",
            text.muted,
            "group-hover:gap-2.5 transition-[gap] duration-150",
          )}
        >
          Baca
          <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={3} />
        </span>
      </Link>

      {/* Bottom hem: the thumb zone. */}
      <Hem className={cn("shrink-0", text.rule)}>
        <div className="flex items-center justify-between gap-2 px-3 pt-4 pb-3">
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
            tone={ink.onPanel === "ink" ? "ink" : "bone"}
          />
          {article.authorName ? (
            <span
              className={cn(
                "hidden truncate text-[0.75rem] sm:inline",
                text.muted,
              )}
            >
              {article.authorName}
            </span>
          ) : null}
        </div>
      </Hem>

      {showSwipeHint ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-[4.25rem] z-10 flex justify-center",
            text.muted,
          )}
        >
          {/* Settles downward and fades, the way a hung edge lifts and drops.
              No bounce: a vinyl sheet decelerates. */}
          <ChevronDown
            className="size-5 motion-safe:animate-[tng-nudge_1.8s_var(--ease-tack)_infinite]"
            strokeWidth={2.6}
          />
        </span>
      ) : null}
    </BannerPanel>
  );
}

/** Compact list row for pillar pages and related rails. */
export function FeedRow({ article }: { article: ArticleSummary }) {
  const ink = PILLAR_INK[article.pillar];

  return (
    <BannerPanel
      as="article"
      ink="wall"
      lift="sm"
      className="group transition-[transform,box-shadow] duration-100 hover:-translate-y-[2px] hover:shadow-[var(--shadow-hard)]"
    >
      <Link href={`/artikel/${article.slug}`} className="flex gap-3 p-3">
        <span
          aria-hidden="true"
          className={cn("w-1.5 shrink-0 self-stretch", ink.accentBar)}
        />
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 flex items-center gap-2">
            <span className={cn("tng-label text-[0.5625rem]", ink.accentText)}>
              {PILLAR_META[article.pillar].label}
            </span>
            {article.isSample ? (
              <span className="tng-label text-[0.5625rem] text-muted">
                Contoh
              </span>
            ) : null}
            <time
              dateTime={article.publishedAt ?? undefined}
              className="tng-label ml-auto text-[0.5625rem] text-muted"
            >
              {formatFeedTime(article.publishedAt)}
            </time>
          </span>
          <h3 className="tng-display-tight text-[1.0625rem] leading-tight text-foreground group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
            {article.title}
          </h3>
          {article.dek ? (
            <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-muted">
              {article.dek}
            </p>
          ) : null}
          <span className="mt-2 flex items-center gap-3">
            <ReadCost minutes={article.readingMinutes} tone="bone" />
            {article.authorName ? (
              <span className="truncate text-[0.75rem] text-muted">
                {article.authorName}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </BannerPanel>
  );
}
