import type { Metadata } from "next";
import Link from "next/link";

import { ContributionModerationList } from "@/components/admin/contribution-moderation";
import { TapePatch } from "@/components/shared/tape-patch";
import { EmptyState, SetupNotice } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/auth";
import { listContributions } from "@/lib/data/admin";
import { CONTRIBUTION_STATUSES, type ContributionStatus } from "@/types/domain";

export const metadata: Metadata = {
  title: "Kontribusi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ContributionStatus | "all", string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  all: "Semua",
};

export default async function AdminContributionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("editor", { returnTo: "/admin/kontribusi" });

  const params = await searchParams;
  const raw = params.status;
  const statusParam = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  const status: ContributionStatus | "all" =
    statusParam &&
    (CONTRIBUTION_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as ContributionStatus)
      : "pending";

  const result = await listContributions(status);

  return (
    <div className="grid gap-3">
      <header>
        <TapePatch tone="orange" tilt="left">
          Kontribusi
        </TapePatch>
        <h1 className="tng-display mt-2 text-[2rem] leading-[0.92] sm:text-[2.5rem]">
          Moderasi kiriman
        </h1>
        <p className="mt-1 text-[0.8125rem] text-muted">
          Menyetujui kiriman tidak menayangkannya. Kiriman yang disetujui dibuat
          jadi draft artikel untuk disunting editor.
        </p>
      </header>

      {result.source === "unconfigured" ? (
        <SetupNotice
          title="Database belum tersambung"
          description="Kiriman komunitas disimpan di Supabase. Isi kredensial dan jalankan migration untuk mengaktifkan moderasi."
          envKeys={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      ) : null}

      <nav aria-label="Filter status" className="tng-scroll-x flex gap-1.5 py-1">
        {(["pending", "approved", "rejected", "all"] as const).map((option) => {
          const isActive = status === option;
          return (
            <Link
              key={option}
              href={
                option === "pending"
                  ? "/admin/kontribusi"
                  : `/admin/kontribusi?status=${option}`
              }
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[2px] border-2 px-3",
                "font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.1em]",
                isActive
                  ? "border-keyline bg-bone text-ink shadow-[var(--shadow-hard-sm)]"
                  : "border-line bg-surface text-muted hover:border-keyline hover:text-foreground",
              )}
            >
              {isActive ? (
                <span aria-hidden="true" className="size-1.5 bg-ink" />
              ) : null}
              {STATUS_LABEL[option]}
            </Link>
          );
        })}
      </nav>

      {result.data.length === 0 && result.source !== "unconfigured" ? (
        <EmptyState
          patch="Kosong"
          title={
            status === "pending"
              ? "Antrean moderasi bersih"
              : `Tidak ada kiriman ${STATUS_LABEL[status].toLowerCase()}`
          }
          description={
            status === "pending"
              ? "Tidak ada kiriman baru yang perlu ditinjau. Kiriman berikutnya akan muncul di sini."
              : "Coba lihat status lain."
          }
        />
      ) : (
        <ContributionModerationList contributions={result.data} />
      )}
    </div>
  );
}
