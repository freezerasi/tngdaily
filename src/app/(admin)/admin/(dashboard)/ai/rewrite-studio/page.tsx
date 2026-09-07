import type { Metadata } from "next";

import { RewriteStudio } from "@/components/ai/rewrite-studio";
import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { requireRole } from "@/lib/auth";
import { listRewriteJobs } from "@/lib/data/ai";
import { formatFeedTime } from "@/lib/dates";

export const metadata: Metadata = {
  title: "AI Rewrite Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RewriteStudioPage() {
  await requireRole("editor", { returnTo: "/admin/ai/rewrite-studio" });

  const jobs = await listRewriteJobs(8);

  return (
    <div className="grid gap-3">
      <header>
        <TapePatch tone="orange" tilt="left">
          Rewrite Studio
        </TapePatch>
        <h1 className="tng-display mt-2 text-[2rem] leading-[0.92] sm:text-[2.5rem]">
          Sintesis dari sumber
        </h1>
        <p className="tng-measure mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
          Alat ini untuk mensintesis fakta menjadi artikel baru dengan atribusi,
          bukan untuk menyalin atau menyamarkan karya orang lain. Setiap sumber
          yang dipakai wajib disebut di dalam artikel.
        </p>
      </header>

      <RewriteStudio />

      {jobs.data.length > 0 ? (
        <section>
          <h2 className="tng-display mb-2 text-xl">Job terakhir</h2>
          <ul className="grid gap-2">
            {jobs.data.map((job) => (
              <li key={job.id}>
                <BannerPanel ink="deep" lift="sm" className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TapePatch
                      tone={
                        job.status === "completed"
                          ? "lime"
                          : job.status === "failed"
                            ? "danger"
                            : "orange"
                      }
                      size="sm"
                    >
                      {job.status}
                    </TapePatch>
                    {job.decision ? (
                      <TapePatch tone="outline" size="sm">
                        {job.decision}
                      </TapePatch>
                    ) : null}
                    {job.similarityScore !== null ? (
                      <span className="tng-label text-muted tabular-nums">
                        kemiripan {Math.round(job.similarityScore * 100)}%
                      </span>
                    ) : null}
                    <span className="tng-label ml-auto text-muted">
                      {formatFeedTime(job.createdAt)}
                    </span>
                  </div>
                  <ul className="mt-1.5 grid gap-0.5">
                    {job.sourceUrls.map((url) => (
                      <li
                        key={url}
                        className="truncate text-[0.75rem] text-muted"
                      >
                        {url}
                      </li>
                    ))}
                  </ul>
                  {job.errorMessage ? (
                    <p className="mt-1.5 border-l-2 border-danger pl-2 text-[0.75rem] text-danger">
                      {job.errorMessage}
                    </p>
                  ) : null}
                </BannerPanel>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
