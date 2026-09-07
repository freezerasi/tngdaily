import type { Metadata } from "next";
import Link from "next/link";
import {
  Eye,
  FileText,
  Heart,
  Inbox,
  Plus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { EmptyState, SetupNotice } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ArticleStatusMark } from "@/components/admin/article-status-mark";
import { getDashboardStats, listArticlesForAdmin } from "@/lib/data/admin";
import { requireRole } from "@/lib/auth";
import { formatFeedTime } from "@/lib/dates";
import { formatCompactNumber } from "@/lib/utils";
import { PILLAR_META } from "@/types/domain";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireRole("editor", { returnTo: "/admin" });

  const [statsResult, recentResult] = await Promise.all([
    getDashboardStats(),
    listArticlesForAdmin({ pageSize: 6 }),
  ]);

  const stats = statsResult.data;

  return (
    <div className="grid gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TapePatch tone="lime" tilt="left">
            Dashboard
          </TapePatch>
          <h1 className="tng-display mt-2 text-[2rem] leading-[0.92] sm:text-[2.5rem]">
            Ringkasan redaksi
          </h1>
        </div>
        <Button asChild variant="primary" size="md">
          <Link href="/admin/konten/baru">
            <Plus aria-hidden="true" />
            Buat artikel
          </Link>
        </Button>
      </header>

      {statsResult.source === "unconfigured" ? (
        <SetupNotice
          title="Database belum tersambung"
          description="Statistik dan daftar konten dibaca dari Supabase. Isi kredensial dan jalankan migration untuk mengaktifkan dashboard."
          envKeys={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      ) : null}

      {statsResult.error ? (
        <BannerPanel ink="deep" lift="sm" className="border-danger p-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-danger"
              strokeWidth={2.4}
            />
            <div>
              <h2 className="tng-display-tight text-base">
                Statistik gagal dimuat
              </h2>
              <p className="mt-1 text-[0.8125rem] text-muted">
                Kueri ke database gagal. Periksa policy RLS untuk role kamu.
              </p>
            </div>
          </div>
        </BannerPanel>
      ) : null}

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile
          label="Tayang"
          value={String(stats.publishedCount)}
          icon={FileText}
          tone="lime"
        />
        <StatTile
          label="Draft dan review"
          value={String(stats.draftCount)}
          icon={FileText}
          tone="bone"
        />
        <StatTile
          label="Terjadwal"
          value={String(stats.scheduledCount)}
          icon={FileText}
          tone="orange"
        />
        <StatTile
          label="Kontribusi pending"
          value={String(stats.pendingContributions)}
          icon={Inbox}
          tone="tape"
          href="/admin/kontribusi"
        />
      </section>

      <section className="grid gap-2 sm:grid-cols-3">
        <StatTile
          label="Total views"
          value={formatCompactNumber(stats.totalViews)}
          icon={Eye}
          tone="wall"
        />
        <StatTile
          label="Total reaksi"
          value={formatCompactNumber(stats.totalReactions)}
          icon={Heart}
          tone="wall"
        />
        <StatTile
          label="Request AI 7 hari"
          value={
            stats.aiRequests7d === 0
              ? "0"
              : `${stats.aiRequests7d} · ${stats.aiSuccessRate7d}% sukses`
          }
          icon={Sparkles}
          tone="wall"
          href="/admin/ai"
        />
      </section>

      <section>
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="tng-display text-xl">Konten terakhir disentuh</h2>
          <span aria-hidden="true" className="h-[2px] flex-1 bg-line" />
          <Link
            href="/admin/konten"
            className="tng-label text-lime hover:underline hover:decoration-2 hover:underline-offset-4"
          >
            Semua
          </Link>
        </div>

        {recentResult.data.items.length === 0 ? (
          <EmptyState
            patch="Kosong"
            title="Belum ada artikel"
            description="Mulai dari artikel manual, atau pakai Content Studio untuk menyusun draft dari ide."
            action={
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="primary" size="sm">
                  <Link href="/admin/konten/baru">Buat artikel</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/ai/content-studio">Content Studio</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="grid gap-2">
            {recentResult.data.items.map((article) => (
              <li key={article.id}>
                <BannerPanel ink="wall" lift="sm">
                  <Link
                    href={`/admin/konten/${article.id}/edit`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3"
                  >
                    <ArticleStatusMark
                      status={article.status}
                      scheduledAt={article.scheduledAt}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[0.9375rem] font-extrabold text-foreground">
                        {article.title}
                      </span>
                      <span className="mt-0.5 block text-[0.75rem] text-muted">
                        {PILLAR_META[article.pillar].label} ·{" "}
                        {formatFeedTime(article.updatedAt)}
                        {article.generatedByAi ? " · dibantu AI" : ""}
                      </span>
                    </span>
                    <span className="tng-label shrink-0 text-muted tabular-nums">
                      {formatCompactNumber(article.counts.view)} views
                    </span>
                  </Link>
                </BannerPanel>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  icon: typeof FileText;
  tone: "lime" | "orange" | "bone" | "tape" | "wall";
  href?: string;
}) {
  const accent = {
    lime: "bg-lime",
    orange: "bg-orange",
    bone: "bg-bone",
    tape: "bg-tape",
    wall: "bg-line",
  }[tone];

  const body = (
    <>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className={`h-4 w-1.5 ${accent}`} />
        <Icon aria-hidden="true" className="size-4 text-muted" strokeWidth={2.4} />
      </span>
      <span className="mt-2 block font-display text-[1.6rem] font-extrabold leading-none tabular-nums text-foreground">
        {value}
      </span>
      <span className="tng-label mt-1.5 block text-muted">{label}</span>
    </>
  );

  return (
    <BannerPanel ink="deep" lift="sm" className="h-full">
      {href ? (
        <Link href={href} className="block p-3">
          {body}
        </Link>
      ) : (
        <div className="p-3">{body}</div>
      )}
    </BannerPanel>
  );
}
