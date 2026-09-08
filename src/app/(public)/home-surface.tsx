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
import {
  homePageJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import type { ArticleSummary } from "@/lib/data/types";

type HomeSort = "terbaru" | "populer";

export async function HomeSurface({ sort }: { sort: HomeSort }) {
  const articlesPromise = getPublishedArticles({ limit: 15 });
  const radarSlotsPromise = articlesPromise.then((result) =>
    getRadarSlots({ articles: result.data.items }),
  );

  const [{ data, source, error }, radarSlots, partnerStories, archive] =
    await Promise.all([
      articlesPromise,
      radarSlotsPromise,
      getPartnerStories(),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homePageJsonLd(ordered)) }}
      />

      <h1 className="sr-only">
        TNG Daily, media anak muda Tangerang Raya
      </h1>

      <NewsTicker articles={ordered} />

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

      <FilterTabs active={sort === "populer" ? "trending" : "semua"} />

      {feed.length > 0 ? (
        <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4">
          <BentoFeed articles={feed} />
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-3 pb-6 sm:px-4">
        <AdSlot format="leaderboard" slotId="home-after-feed" />
      </div>

      <PartnerAndArchiveBand stories={partnerStories} archive={archive} />
      <RadarModule slots={radarSlots} />
      <CtaBanner />
    </>
  );
}

function BentoFeed({ articles }: { articles: ArticleSummary[] }) {
  const pool = [...articles];

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
