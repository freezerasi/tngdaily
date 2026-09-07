import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { taskTypeLabel } from "@/lib/labels";
import { formatFeedTime } from "@/lib/dates";
import type { AiUsageLogView, AiUsageStats } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * Usage panel.
 *
 * Reads from `ai_usage_log`, which stores metadata only: no prompts, no
 * responses, no keys. Enough to see which provider is reliable, nothing that
 * could leak editorial content or a credential.
 */
export function AiUsagePanel({
  stats,
  log,
}: {
  stats: AiUsageStats;
  log: AiUsageLogView[];
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="tng-display text-xl">Pemakaian 7 hari</h2>
        <p className="mt-1 text-[0.8125rem] text-muted">
          Log menyimpan metadata saja: task, provider, model, status, latensi, dan
          token. Prompt dan respons tidak disimpan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Total request" value={String(stats.totalRequests)} />
        <Metric label="Success rate" value={`${stats.successRate}%`} />
        <Metric
          label="Latensi rata-rata"
          value={stats.averageLatencyMs === 0 ? "-" : `${stats.averageLatencyMs} ms`}
        />
        <Metric
          label="Token terpakai"
          value={stats.totalTokens === 0 ? "-" : stats.totalTokens.toLocaleString("id-ID")}
        />
      </div>

      {stats.perProvider.length > 0 ? (
        <BannerPanel ink="deep" lift="sm" className="p-3">
          <h3 className="tng-label text-muted">Per provider</h3>
          <ul className="mt-2 grid gap-2">
            {stats.perProvider.map((entry) => (
              <li key={entry.providerName} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-[0.875rem] font-extrabold text-foreground">
                    {entry.providerName}
                  </span>
                  <span className="tng-label text-muted tabular-nums">
                    {entry.requests} request · {entry.successRate}% sukses ·{" "}
                    {entry.averageLatencyMs} ms
                  </span>
                </div>
                {/* Bar doubles as the success indicator, with the number beside it. */}
                <div
                  className="h-2 w-full border border-line bg-wall"
                  role="img"
                  aria-label={`${entry.providerName}: ${entry.successRate} persen sukses`}
                >
                  <div
                    className={cn(
                      "h-full",
                      entry.successRate >= 90
                        ? "bg-lime"
                        : entry.successRate >= 60
                          ? "bg-orange"
                          : "bg-danger",
                    )}
                    style={{ width: `${Math.max(2, entry.successRate)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </BannerPanel>
      ) : null}

      <BannerPanel ink="deep" lift="sm" className="p-3">
        <h3 className="tng-label text-muted">Log terakhir</h3>
        {log.length === 0 ? (
          <p className="mt-2 text-[0.8125rem] text-muted">
            Belum ada request AI yang tercatat.
          </p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line pb-1.5 text-[0.75rem] last:border-0 last:pb-0"
              >
                {entry.success ? (
                  <TapePatch tone="lime" size="sm">
                    OK
                  </TapePatch>
                ) : (
                  <TapePatch tone="danger" size="sm">
                    Gagal
                  </TapePatch>
                )}
                <span className="font-display font-extrabold uppercase tracking-[0.06em] text-foreground">
                  {taskTypeLabel(entry.taskType)}
                </span>
                <span className="text-muted">
                  {entry.providerName ?? "provider tidak diketahui"}
                  {entry.model ? ` · ${entry.model}` : ""}
                </span>
                {entry.errorCode ? (
                  <span className="font-mono text-danger">{entry.errorCode}</span>
                ) : null}
                <span className="ml-auto text-muted tabular-nums">
                  {entry.latencyMs ? `${entry.latencyMs} ms · ` : ""}
                  {entry.attempt > 1 ? `coba ke-${entry.attempt} · ` : ""}
                  {formatFeedTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BannerPanel>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <BannerPanel ink="deep" lift="sm" className="p-3">
      <span className="block font-display text-[1.5rem] font-extrabold leading-none tabular-nums text-foreground">
        {value}
      </span>
      <span className="tng-label mt-1.5 block text-muted">{label}</span>
    </BannerPanel>
  );
}
