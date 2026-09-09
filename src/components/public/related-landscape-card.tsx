import Link from "next/link";

import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { BannerPanel } from "@/components/shared/banner-panel";
import { formatFeedTime } from "@/lib/dates";
import { PILLAR_INK } from "@/lib/pillar-ink";
import { PILLAR_META } from "@/types/domain";
import type { ArticleSummary } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function RelatedLandscapeCard({
  article,
  className,
}: {
  article: ArticleSummary;
  className?: string;
}) {
  const ink = PILLAR_INK[article.pillar];
  const author = article.authorName?.trim() || "Redaksi TNG Daily";

  return (
    <BannerPanel
      as="article"
      ink="wall"
      lift="sm"
      className={cn(
        "group h-full overflow-hidden border-2 border-line transition-[transform,box-shadow,border-color] duration-150",
        "hover:-translate-y-[2px] hover:border-lime hover:shadow-[var(--shadow-hard)]",
        className,
      )}
    >
      <Link
        href={`/artikel/${article.slug}`}
        className="flex h-full min-w-0 flex-col sm:flex-row"
      >
        {/* Landscape Thumbnail */}
        {article.coverImageUrl ? (
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b-2 border-line sm:aspect-auto sm:w-44 md:w-48 lg:w-52 sm:border-b-0 sm:border-r-2 bg-surface-strong">
            <CloudinaryImage
              src={article.coverImageUrl}
              alt={article.coverImageAlt ?? article.title}
              sizes="(min-width: 1024px) 220px, (min-width: 640px) 190px, 100vw"
              widths={[320, 480, 640]}
              className="transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            />
            <span
              className={cn(
                "absolute bottom-2 left-2 inline-flex items-center border-2 border-keyline bg-ink px-1.5 py-0.5 font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.12em]",
                ink.accentText,
              )}
            >
              {PILLAR_META[article.pillar].label}
            </span>
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="relative aspect-[16/10] w-full shrink-0 border-b-2 border-line sm:aspect-auto sm:w-44 md:w-48 lg:w-52 sm:border-b-0 sm:border-r-2 bg-surface-strong"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(236,231,217,0.06) 0 3px, transparent 3px 11px)",
            }}
          >
            <span
              className={cn(
                "absolute bottom-2 left-2 inline-flex items-center border-2 border-keyline bg-ink px-1.5 py-0.5 font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.12em]",
                ink.accentText,
              )}
            >
              {PILLAR_META[article.pillar].label}
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex flex-1 flex-col justify-between p-3 sm:p-3.5 min-w-0">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[0.5625rem] font-bold uppercase tracking-wider text-muted">
                {article.readingMinutes} menit baca
              </span>
              {article.isSample ? (
                <span className="inline-flex items-center border border-tape/60 bg-tape/15 px-1 py-0.2 font-display text-[0.5rem] font-bold uppercase text-tape">
                  Contoh
                </span>
              ) : null}
            </div>

            <h3 className="tng-display-tight mt-1 text-[1rem] font-bold leading-snug text-foreground transition-colors group-hover:text-lime sm:text-[1.0625rem]">
              {article.title}
            </h3>

            {article.dek ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                {article.dek}
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2 text-[0.6875rem] text-muted">
            <span className="truncate font-semibold text-foreground/80">
              {author}
            </span>
            <time dateTime={article.publishedAt ?? undefined} className="shrink-0 tabular-nums">
              {formatFeedTime(article.publishedAt)}
            </time>
          </div>
        </div>
      </Link>
    </BannerPanel>
  );
}
