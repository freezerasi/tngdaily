import type { Metadata } from "next";
import { randomUUID } from "node:crypto";

import { ContentStudio } from "@/components/ai/content-studio";
import { TapePatch } from "@/components/shared/tape-patch";
import { BannerPanel } from "@/components/shared/banner-panel";
import { requireRole } from "@/lib/auth";
import { listRecentStudioSessions } from "@/lib/data/ai";
import { formatFeedTime } from "@/lib/dates";
import { taskTypeLabel } from "@/lib/ai/prompts";

export const metadata: Metadata = {
  title: "AI Content Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContentStudioPage() {
  await requireRole("editor", { returnTo: "/admin/ai/content-studio" });

  const recent = await listRecentStudioSessions(6);

  // A fresh session key per visit groups this run's jobs; the key is opaque and
  // carries no user data.
  const sessionKey = `cs-${randomUUID().slice(0, 12)}`;

  return (
    <div className="grid gap-3">
      <header>
        <TapePatch tone="lime" tilt="left">
          Content Studio
        </TapePatch>
        <h1 className="tng-display mt-2 text-[2rem] leading-[0.92] sm:text-[2.5rem]">
          Ide ke draft, lima tahap
        </h1>
        <p className="tng-measure mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
          Setiap tahap tersimpan sebagai job terpisah, bisa diregenerate tanpa
          menghapus hasil sebelumnya. Tidak ada tahap yang menayangkan apa pun.
        </p>
      </header>

      <ContentStudio sessionKey={sessionKey} />

      {recent.data.length > 0 ? (
        <section>
          <h2 className="tng-display mb-2 text-xl">Sesi terakhir</h2>
          <ul className="grid gap-2">
            {recent.data.map((job) => (
              <li key={job.id}>
                <BannerPanel ink="deep" lift="sm" className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TapePatch
                      tone={job.status === "completed" ? "lime" : "orange"}
                      size="sm"
                    >
                      {job.status}
                    </TapePatch>
                    <span className="font-mono text-[0.75rem] text-muted">
                      {job.sessionKey}
                    </span>
                    <span className="tng-label text-muted">
                      {taskTypeLabel(job.taskType)}
                    </span>
                    <span className="tng-label ml-auto text-muted">
                      {formatFeedTime(job.createdAt)}
                    </span>
                  </div>
                  {job.providerName ? (
                    <p className="mt-1.5 text-[0.75rem] text-muted">
                      {job.providerName}
                      {job.model ? ` · ${job.model}` : ""}
                      {job.promptTemplateKey
                        ? ` · ${job.promptTemplateKey} v${job.promptVersion ?? 1}`
                        : ""}
                    </p>
                  ) : null}
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
