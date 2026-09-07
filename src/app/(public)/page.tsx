import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ads/ad-slot";
import { PartnerAndArchiveBand } from "@/components/editorial/partner-archive-band";
import { EditorialHero } from "@/components/hero/editorial-hero";
import { ArticleCard } from "@/components/news/article-card";
import { CommunityBox } from "@/components/news/community-box";
import { CtaBanner } from "@/components/news/cta-banner";
import { FilterTabs } from "@/components/news/filter-tabs";
import { NewsTicker } from "@/components/news/news-ticker";
import { RadarModule } from "@/components/news/radar-module";
import { EmptyState, SetupNotice } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getPublishedArticles } from "@/lib/data/articles";
import { getOnThisDay } from "@/lib/data/on-this-day";
import { getPartnerStories } from "@/lib/data/partners";
import { getRadarSlots } from "@/lib/data/radar";
import { organizationJsonLd, SITE_DESCRIPTION } from "@/lib/seo";
import type { ArticleSummary } from "@/lib/data/types";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description: SITE_DESCRIPTION,
};

export const revalidate = 300;

/**
 * Homepage: pulse strip, masthead, ticker, asymmetric hero, sticky filter,
 * bento feed, radar module.
 *
 * The `urut=populer` param switches the ordering to most-read, which powers the
 * Trending tab without a second route.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawSort = params.urut;
  const sort = (Array.isArray(rawSort) ? rawSort[0] : rawSort) === "populer"
    ? "populer"
    : "terbaru";

  const articlesPromise = getPublishedArticles({ limit: 15 });
  const radarSlotsPromise = articlesPromise.then((result) =>
    getRadarSlots({ articles: result.data.items }),
  );

  const [{ data, source, error }, radarSlots, partnerStories, archive] =
    await Promise.all([
      articlesPromise,
      radarSlotsPromise,
      getPartnerStories(),
      // Three entries matching the partner column height.
      getOnThisDay(3),
    ]);

  const ordered =
    sort === "populer"
      ? [...data.items].sort((a, b) => b.counts.view - a.counts.view)
      : data.items;

  const [lead, ...rest] = ordered;
  const radar = rest.slice(0, 3);
  const feed = rest.slice(3);

  // The lead's first tag doubles as its location badge when it names a place.
  const leadLocation = lead ? locationFromArticle(lead) : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        // Static, server-authored JSON-LD. No user input reaches this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      <h1 className="sr-only">
        TNG Daily, media anak muda Tangerang Raya
      </h1>

      {/* 1. Ticker. Renders its own honest empty line when there is nothing. */}
      <NewsTicker articles={ordered} />

      {/* 2. Hero Section */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        {source === "unconfigured" ? (
          <div className="py-4">
            <SetupNotice
              title="Database belum tersambung"
              description="Feed publik membaca artikel dari Supabase. Isi kredensial di .env.local, jalankan migration di supabase/migrations, lalu seed prompt dan konten contoh."
              envKeys={[
                "NEXT_PUBLIC_SUPABASE_URL",
                "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                "SUPABASE_SERVICE_ROLE_KEY",
              ]}
              docHint="Langkah lengkap ada di README bagian Setup Supabase."
            />
          </div>
        ) : null}

        {error ? (
          <div className="py-4">
            <EmptyState
              patch="Gagal memuat"
              title="Feed tidak bisa dimuat"
              description="Kueri ke database gagal. Coba muat ulang halaman. Kalau terus terjadi, cek status Supabase dan konfigurasi RLS."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/">Muat ulang</Link>
                </Button>
              }
            />
          </div>
        ) : null}

        {ordered.length === 0 && source !== "unconfigured" && !error ? (
          <div className="py-4">
            <EmptyState
              patch="Masih kosong"
              title="Belum ada artikel tayang"
              description="Begitu editor menerbitkan artikel pertama, halaman ini akan terisi. Kalau kamu editor, masuk ke dashboard dan buat artikel."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin">Buka dashboard</Link>
                </Button>
              }
            />
          </div>
        ) : null}

        {lead ? (
          <div className="py-4 sm:py-6">
            <EditorialHero
              lead={lead}
              radar={radar}
              {...(leadLocation ? { leadLocation } : {})}
            />
          </div>
        ) : null}
      </div>

      {/* 3. Filter Tabs (Directly above feed grid, as shown in mockup) */}
      <FilterTabs active={sort === "populer" ? "trending" : "semua"} />

      {/* 4. Bento Feed Grid */}
      {feed.length > 0 ? (
        <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4">
          <BentoFeed articles={feed} />
        </div>
      ) : null}

      {/*
       * 5. Ad slot: between the editorial feed and the commercial section, which
       * is the furthest point from the hero, the filter bar, and every KIRIM
       * CERITA control. Disabled, and collapsed entirely in production.
       */}
      <div className="mx-auto max-w-7xl px-3 pb-6 sm:px-4">
        <AdSlot format="leaderboard" slotId="home-after-feed" />
      </div>

      {/*
       * 6. Partner stories and the archive panel, in one band.
       *
       * Both sit outside the daily news cycle: one commercial, one historical.
       * Pairing them after the editorial feed draws a single clear boundary
       * instead of two vague ones. The band renders nothing if both are empty.
       */}
      <PartnerAndArchiveBand stories={partnerStories} archive={archive} />

      {/* 7. TNG Radar */}
      <RadarModule slots={radarSlots} />

      {/* 8. Participation CTA */}
      <CtaBanner />
    </>
  );
}

/**
 * Bento feed: four columns on desktop, one on mobile.
 *
 * Rhythm comes from three card types in a fixed rotation rather than from
 * per-card special cases, so a changing article count never breaks the grid:
 *
 *   slot 4  — QuoteCard, pulled from SUARA if one is available
 *   slot 8  — CommunityCard
 *   rest    — StandardCard
 *
 * `items-stretch` plus `h-full` on every card means a row's cards share a
 * height, so the quote and community tiles do not leave a ragged edge when they
 * are shorter than a photo card.
 */
function BentoFeed({ articles }: { articles: ArticleSummary[] }) {
  const pool = [...articles];

  // Prefer a SUARA piece in the quote slot: the rubrik is opinion and vox pop,
  // which is what a pull-quote treatment is for.
  const suaraIdx = pool.findIndex((a, idx) => idx >= 3 && a.pillar === "suara");
  if (suaraIdx > 3) {
    const [suaraItem] = pool.splice(suaraIdx, 1);
    if (suaraItem) pool.splice(3, 0, suaraItem);
  }

  const cards: React.ReactNode[] = [];

  pool.slice(0, 7).forEach((article, index) => {
    cards.push(
      <ArticleCard
        key={article.id}
        variant={index === 3 ? "quote" : "standard"}
        article={article}
      />,
    );
  });

  cards.push(<CommunityBox key="community-box-feed" />);

  pool.slice(7).forEach((article) => {
    cards.push(
      <ArticleCard key={article.id} variant="standard" article={article} />,
    );
  });

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards}
    </div>
  );
}


/** Reads a place name out of an article's tags for the hero location badge. */
const PLACE_TAGS: Record<string, string> = {
  cipondoh: "Cipondoh, Kota Tangerang",
  karawaci: "Karawaci, Kota Tangerang",
  cikokol: "Cikokol, Kota Tangerang",
  neglasari: "Neglasari, Kota Tangerang",
  batuceper: "Batuceper, Kota Tangerang",
  serpong: "Serpong, Tangerang Selatan",
  pamulang: "Pamulang, Tangerang Selatan",
  bintaro: "Bintaro, Tangerang Selatan",
  ciledug: "Ciledug, Kota Tangerang",
  "pasar lama": "Pasar Lama, Kota Tangerang",
  "kota tangerang": "Kota Tangerang",
};

function locationFromArticle(article: ArticleSummary): string | undefined {
  for (const tag of article.tags) {
    const match = PLACE_TAGS[tag];
    if (match) return match;
  }
  return undefined;
}
