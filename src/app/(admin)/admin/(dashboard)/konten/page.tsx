import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ArticleStatusMark } from "@/components/admin/article-status-mark";
import { ContentFilters } from "@/components/admin/content-filters";
import { BannerPanel } from "@/components/shared/banner-panel";
import { EmptyState, SetupNotice } from "@/components/shared/empty-state";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { listArticlesForAdmin } from "@/lib/data/admin";
import { formatFeedTime } from "@/lib/dates";
import { formatCompactNumber } from "@/lib/utils";
import {
  ARTICLE_STATUSES,
  PILLARS,
  PILLAR_META,
  isArticleStatus,
  isPillar,
  type ArticleStatus,
  type Pillar,
} from "@/types/domain";

export const metadata: Metadata = {
  title: "Konten",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("editor", { returnTo: "/admin/konten" });

  const params = await searchParams;
  const statusParam = readParam(params, "status");
  const pillarParam = readParam(params, "pillar");
  const search = readParam(params, "q")?.slice(0, 80);
  const page = Math.max(1, Number.parseInt(readParam(params, "page") ?? "1", 10) || 1);

  const status: ArticleStatus | "all" =
    statusParam && isArticleStatus(statusParam) ? statusParam : "all";
  const pillar: Pillar | "all" =
    pillarParam && isPillar(pillarParam) ? pillarParam : "all";

  const result = await listArticlesForAdmin({
    status,
    pillar,
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
  });

  const { items, total, hasMore } = result.data;

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = {
      status: status === "all" ? undefined : status,
      pillar: pillar === "all" ? undefined : pillar,
      q: search,
      page: page > 1 ? String(page) : undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/admin/konten?${query}` : "/admin/konten";
  };

  return (
    <div className="grid gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TapePatch tone="bone" tilt="left">
            Konten
          </TapePatch>
          <h1 className="tng-display mt-2 text-[2rem] leading-[0.92] sm:text-[2.5rem]">
            Semua artikel
          </h1>
          <p className="mt-1 text-[0.8125rem] text-muted">
            {result.source === "unconfigured"
              ? "Database belum tersambung."
              : `${total} artikel`}
          </p>
        </div>
        <Button asChild variant="primary" size="md">
          <Link href="/admin/konten/baru">
            <Plus aria-hidden="true" />
            Buat artikel
          </Link>
        </Button>
      </header>

      {result.source === "unconfigured" ? (
        <SetupNotice
          title="Database belum tersambung"
          description="Daftar artikel dibaca dari Supabase dengan RLS aktif. Isi kredensial dan jalankan migration lebih dulu."
          envKeys={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]}
        />
      ) : null}

      <ContentFilters
        statuses={ARTICLE_STATUSES}
        pillars={PILLARS}
        activeStatus={status}
        activePillar={pillar}
        {...(search ? { search } : {})}
      />

      {items.length === 0 && result.source !== "unconfigured" ? (
        <EmptyState
          patch="Nol hasil"
          title={
            search || status !== "all" || pillar !== "all"
              ? "Tidak ada artikel yang cocok"
              : "Belum ada artikel"
          }
          description={
            search || status !== "all" || pillar !== "all"
              ? "Coba lepas salah satu filter."
              : "Buat artikel pertama, atau susun draft dari Content Studio."
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="primary" size="sm">
                <Link href="/admin/konten/baru">Buat artikel</Link>
              </Button>
              {(search || status !== "all" || pillar !== "all") && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/konten">Reset filter</Link>
                </Button>
              )}
            </div>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-2">
          {items.map((article) => (
            <li key={article.id}>
              <BannerPanel ink="wall" lift="sm">
                <Link
                  href={`/admin/konten/${article.id}/edit`}
                  className="grid gap-2 p-3 sm:flex sm:items-center sm:gap-3"
                >
                  <ArticleStatusMark
                    status={article.status}
                    scheduledAt={article.scheduledAt}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[0.9375rem] font-extrabold leading-tight text-foreground">
                      {article.title}
                    </span>
                    <span className="mt-1 block text-[0.75rem] text-muted">
                      {PILLAR_META[article.pillar].label} · /{article.slug} ·
                      diperbarui {formatFeedTime(article.updatedAt)}
                      {article.generatedByAi ? " · dibantu AI" : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="tng-label text-muted tabular-nums">
                      {formatCompactNumber(article.counts.view)} views
                    </span>
                    <span className="tng-label text-muted tabular-nums">
                      {formatCompactNumber(article.counts.like)} suka
                    </span>
                  </span>
                </Link>
              </BannerPanel>
            </li>
          ))}
        </ul>
      ) : null}

      {(page > 1 || hasMore) && (
        <nav
          aria-label="Halaman"
          className="flex items-center justify-between gap-2 pt-1"
        >
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref({ page: page === 2 ? undefined : String(page - 1) })}>
                Sebelumnya
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="tng-label text-muted">Halaman {page}</span>
          {hasMore ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref({ page: String(page + 1) })}>Berikutnya</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
