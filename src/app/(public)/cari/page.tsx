import type { Metadata } from "next";
import Link from "next/link";

import { CategoryRail } from "@/components/public/category-rail";
import { FeedRow } from "@/components/public/feed-card";
import { BannerPanel, Wall } from "@/components/shared/banner-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { getPublishedArticles } from "@/lib/data/articles";

export const metadata: Metadata = {
  title: "Cari artikel",
  description: "Cari artikel TNG Daily berdasarkan judul.",
  alternates: { canonical: "/cari" },
  robots: { index: false, follow: true },
};

/**
 * Search. A plain GET form so the query lives in the URL and the results are
 * server-rendered: no client fetch, no loading spinner, shareable result page.
 */
export default async function CariPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 80) ?? "";

  const result = query.length >= 2
    ? await getPublishedArticles({ search: query, limit: 20 })
    : null;

  return (
    <Wall className="px-2 py-4">
      <div className="px-1">
        <CategoryRail />
      </div>

      <BannerPanel ink="wall" lift="md" className="mt-2 p-4 sm:p-5">
        <TapePatch tone="bone" tilt="left">
          Cari
        </TapePatch>
        <h1 className="tng-display mt-3 text-[2rem] leading-[0.92] sm:text-[2.75rem]">
          Cari artikel
        </h1>
        <form action="/cari" method="get" className="mt-4 flex flex-wrap gap-2">
          <label htmlFor="q" className="sr-only">
            Kata kunci
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Misal: angkot, kos, pasar lama"
            className="min-w-0 flex-1 sm:max-w-sm"
            maxLength={80}
          />
          <Button type="submit" variant="primary" size="md">
            Cari
          </Button>
        </form>
        <p className="mt-2 text-[0.8125rem] text-muted">
          Pencarian saat ini mencocokkan judul artikel. Minimal 2 karakter.
        </p>
      </BannerPanel>

      {result ? (
        result.data.items.length > 0 ? (
          <section className="mt-3">
            <p className="px-1 pb-2 text-[0.8125rem] text-muted">
              {result.data.total} hasil untuk{" "}
              <strong className="text-foreground">{query}</strong>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.data.items.map((article) => (
                <FeedRow key={article.id} article={article} />
              ))}
            </div>
          </section>
        ) : (
          <div className="mt-3">
            <EmptyState
              patch="Nol hasil"
              title={`Tidak ada artikel untuk "${query}"`}
              description="Coba kata kunci yang lebih umum, atau telusuri lewat pilar."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/">Ke feed utama</Link>
                </Button>
              }
            />
          </div>
        )
      ) : null}
    </Wall>
  );
}
