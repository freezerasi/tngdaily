import { TriangleAlert } from "lucide-react";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import type { QualityGateOutput } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

/**
 * Quality gate report.
 *
 * Readiness is shown as a patch plus the score and an explicit sentence, so the
 * verdict is never carried by colour alone. Critical issues are pushed to the
 * top because they are what blocks publishing.
 */
const READINESS: Record<
  QualityGateOutput["publish_readiness"],
  { label: string; tone: "lime" | "orange" | "danger" | "tape"; sentence: string }
> = {
  ready: {
    label: "Siap publish",
    tone: "lime",
    sentence: "Audit tidak menemukan isu material. Editor tetap pemegang keputusan.",
  },
  ready_with_minor_edits: {
    label: "Siap dengan perbaikan kecil",
    tone: "tape",
    sentence: "Ada perbaikan kosmetik yang sebaiknya diselesaikan sebelum tayang.",
  },
  needs_editor_review: {
    label: "Perlu review editor",
    tone: "orange",
    sentence: "Jangan tayangkan sebelum editor menyelesaikan isu di bawah.",
  },
  do_not_publish: {
    label: "Jangan publish",
    tone: "danger",
    sentence:
      "Ada isu kritis. Artikel tidak boleh tayang sampai isu ini diselesaikan.",
  },
};

export function QualityReport({ report }: { report: QualityGateOutput }) {
  const readiness = READINESS[report.publish_readiness];
  const blocking =
    report.publish_readiness === "do_not_publish" ||
    report.publish_readiness === "needs_editor_review" ||
    report.critical_issues.length > 0;

  return (
    <BannerPanel
      ink="wall"
      lift="sm"
      className={cn("grid gap-3 p-3 sm:p-4", blocking && "border-danger")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <TapePatch tone={readiness.tone} tilt="left">
          {readiness.label}
        </TapePatch>
        <span className="font-display text-lg font-extrabold tabular-nums text-foreground">
          {report.overall_score}
          <span className="text-sm text-muted">/100</span>
        </span>
      </div>

      <p className="tng-measure text-[0.8125rem] font-semibold leading-relaxed text-foreground">
        {readiness.sentence}
      </p>

      {report.summary ? (
        <p className="tng-measure text-[0.8125rem] leading-relaxed text-muted">
          {report.summary}
        </p>
      ) : null}

      {report.critical_issues.length > 0 ? (
        <section className="grid gap-2">
          <h3 className="tng-label flex items-center gap-1.5 text-danger">
            <TriangleAlert aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
            Isu kritis ({report.critical_issues.length})
          </h3>
          <ul className="grid gap-2">
            {report.critical_issues.map((issue, index) => (
              <li
                key={`${issue.type}-${index}`}
                className="border-l-2 border-danger bg-danger/5 pl-2.5"
              >
                <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-danger">
                  {issue.type}
                </p>
                {issue.location ? (
                  <p className="text-[0.75rem] text-muted">{issue.location}</p>
                ) : null}
                <p className="mt-0.5 text-[0.8125rem] leading-snug text-foreground">
                  {issue.issue}
                </p>
                {issue.fix ? (
                  <p className="mt-1 text-[0.8125rem] leading-snug text-muted">
                    Perbaikan: {issue.fix}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.missing_verification.length > 0 ? (
        <section className="grid gap-1.5">
          <h3 className="tng-label text-orange">Belum terverifikasi</h3>
          <ul className="grid gap-1">
            {report.missing_verification.map((item) => (
              <li
                key={item}
                className="border-l-2 border-orange pl-2 text-[0.8125rem] leading-snug text-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.attribution_check.length > 0 ? (
        <section className="grid gap-1.5">
          <h3 className="tng-label text-muted">Cek atribusi</h3>
          <ul className="grid gap-1">
            {report.attribution_check.map((entry, index) => (
              <li
                key={`${entry.source}-${index}`}
                className="flex flex-wrap items-center gap-2 text-[0.8125rem]"
              >
                <TapePatch
                  tone={
                    entry.status === "present"
                      ? "lime"
                      : entry.status === "missing"
                        ? "danger"
                        : "orange"
                  }
                  size="sm"
                >
                  {entry.status}
                </TapePatch>
                <span className="text-foreground">{entry.source}</span>
                {entry.note ? (
                  <span className="text-muted">{entry.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.style_issues.length > 0 ? (
        <section className="grid gap-1.5">
          <h3 className="tng-label text-muted">
            Catatan gaya ({report.style_issues.length})
          </h3>
          <ul className="grid gap-2">
            {report.style_issues.slice(0, 8).map((issue, index) => (
              <li
                key={`${issue.location}-${index}`}
                className="border-l-2 border-line pl-2.5"
              >
                <p className="text-[0.8125rem] leading-snug text-foreground">
                  {issue.issue}
                </p>
                {issue.suggested_revision ? (
                  <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">
                    Usulan: {issue.suggested_revision}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.final_editor_action ? (
        <p className="border-t-2 border-line pt-2.5 text-[0.8125rem] leading-relaxed text-muted">
          Tindakan editor: {report.final_editor_action}
        </p>
      ) : null}
    </BannerPanel>
  );
}
