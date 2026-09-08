import Link from "next/link";

import { ArticleCard } from "@/components/news/article-card";
import { CommunityBox } from "@/components/news/community-box";
import { FilterTabs } from "@/components/news/filter-tabs";
import { HustleBento } from "@/components/public/hustle-bento";
import { TagFilterRail } from "@/components/public/tag-filter-rail";
import { EditorialHero } from "@/components/hero/editorial-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { getPublishedArticles } from "@/lib/data/articles";
import { getDirectoryListings } from "@/lib/data/directory";
import { PILLAR_INK, onPanelText } from "@/lib/pillar-ink";
import { pillarPageJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { PILLAR_META, type Pillar } from "@/types/domain";
import type { ArticleSummary } from "@/lib/data/types";

/**
 * Shared body for the four pillar routes.
 *
 * Same editorial grammar as the homepage: a compact pillar plate, then the
 * asymmetric hero, then the bento feed. One pillar choice propagates the whole
 * surface, so the plate, the tabs, and every badge re-sign together.
 */

export function sanitizePillarTag(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return undefined;
  }
  const clean = decoded.trim().toLowerCase().slice(0, 32);
  return /^[a-z0-9 -]+$/.test(clean) ? clean : undefined;
}

export async function PillarPageBody({
  pillar,
  tag: rawTag,
}: {
  pillar: Pillar;
  tag?: string;
}) {
  const tag = sanitizePillarTag(rawTag);

  const [articlesResult, listingsResult] = await Promise.all([
    getPublishedArticles({ pillar, limit: 15, ...(tag ? { tag } : {}) }),
    pillar === "hustle" ? getDirectoryListings() : Promise.resolve(null),
  ]);

  const meta = PILLAR_META[pillar];
  const ink = PILLAR_INK[pillar];
  const text = onPanelText(pillar);
  const articles = articlesResult.data.items;
  const [lead, ...rest] = articles;
  const radar = rest.slice(0, 4);
  const feed = rest.slice(4);

  const availableTags = Array.from(
    new Set(articles.flatMap((article) => article.tags)),
  ).slice(0, 10);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pillarPageJsonLd({ pillar, articles, tag })),
        }}
      />

      <FilterTabs active={pillar} showTrending={false} />

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        {/* Pillar plate: wide and short, not a full-height colour field. */}
        <section className="mt-4">
          <div
            className={cn(
              "relative flex flex-wrap items-end gap-x-5 gap-y-2 border-2 border-keyline px-4 py-4 shadow-[var(--shadow-hard)] sm:px-5 sm:py-5",
              ink.panel === "lime" && "bg-lime",
              ink.panel === "orange" && "bg-orange",
              ink.panel === "bone" && "bg-bone",
              ink.panel === "wall" && "bg-surface-strong",
            )}
          >
            <div>
              <TapePatch tone={ink.patch} tilt="left" size="sm">
                Pilar
              </TapePatch>
              <h1
                className={cn(
                  "tng-display mt-2 text-[2.25rem] leading-[0.9] sm:text-[3rem]",
                  text.heading,
                )}
              >
                {meta.wordmark}
              </h1>
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn("tng-label text-[0.5625rem]", text.muted)}>
                {meta.tagline}
              </p>
              <p
                className={cn(
                  "tng-measure mt-1.5 text-[0.875rem] leading-relaxed",
                  text.body,
                )}
              >
                {meta.description}
              </p>
            </div>

            <span
              className={cn(
                "tng-label shrink-0 tabular-nums",
                text.muted,
              )}
            >
              {articlesResult.data.total} liputan
            </span>
          </div>
        </section>

        {availableTags.length > 1 ? (
          <div className="pt-3">
            <TagFilterRail
              pillar={pillar}
              tags={availableTags}
              {...(tag ? { activeTag: tag } : {})}
            />
          </div>
        ) : null}

        {articles.length === 0 ? (
          <div className="py-4">
            <EmptyState
              patch={
                articlesResult.source === "unconfigured"
                  ? "Belum tersambung"
                  : "Masih kosong"
              }
              title={
                tag
                  ? `Belum ada artikel dengan tag "${tag}"`
                  : `Belum ada artikel di ${meta.label}`
              }
              description={
                articlesResult.source === "unconfigured"
                  ? "Database belum tersambung, jadi belum ada artikel yang bisa ditampilkan. Cek README bagian Setup Supabase."
                  : tag
                    ? "Coba hapus filter tag, atau lihat pilar lain."
                    : "Pilar ini belum punya artikel tayang. Cek pilar lain sementara ini."
              }
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href={tag ? `/${pillar}` : "/"}>
                    {tag ? "Hapus filter" : "Ke feed utama"}
                  </Link>
                </Button>
              }
            />
          </div>
        ) : null}

        {lead ? (
          <div className="py-4">
            <EditorialHero lead={lead} radar={radar} />
          </div>
        ) : null}

        {pillar === "hustle" &&
        listingsResult &&
        listingsResult.data.length > 0 ? (
          <section className="pb-5">
            <div className="tng-section-head mb-3">
              <TapePatch tone="lime" tilt="left" size="sm">
                Papan
              </TapePatch>
              <h2 className="tng-display text-xl">Loker dan UMKM</h2>
              <span aria-hidden="true" className="h-[2px] flex-1 bg-line" />
            </div>
            <HustleBento listings={listingsResult.data} />
            <p className="mt-2 text-[0.75rem] text-muted">
              Listing bertanda &ldquo;Contoh data&rdquo; adalah data pengembangan,
              bukan lowongan nyata.
            </p>
          </section>
        ) : null}

        {feed.length > 0 ? (
          <section className="pb-6">
            <div className="tng-section-head mb-3">
              <TapePatch tone="bone" tilt="left" size="sm">
                Feed
              </TapePatch>
              <h2 className="tng-display text-xl">Artikel lain</h2>
              <span aria-hidden="true" className="h-[2px] flex-1 bg-line" />
            </div>
            <PillarFeed articles={feed} />
          </section>
        ) : null}
      </div>
    </>
  );
}

function PillarFeed({ articles }: { articles: ArticleSummary[] }) {
  const tiles: React.ReactNode[] = [];

  articles.forEach((article, index) => {
    if (index === 3) {
      tiles.push(
        <CommunityBox key="community-box" className="sm:col-span-2 lg:col-span-1" />,
      );
    }

    const isQuote = article.pillar === "suara" && !article.coverImageUrl;

    tiles.push(
      <ArticleCard
        key={article.id}
        variant={isQuote ? "quote" : "standard"}
        article={article}
      />,
    );
  });

  if (articles.length <= 3) {
    tiles.push(
      <CommunityBox key="community-box-tail" className="sm:col-span-2 lg:col-span-1" />,
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tiles}
    </div>
  );
}
