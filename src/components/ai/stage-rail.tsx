"use client";

import { Check, Circle, Loader2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Stage rail for the AI studios.
 *
 * The wayfinding donation: every stage is a tick on one rail, and the open stage
 * blooms while the rest stay compact stubs. State is carried by an icon plus a
 * text label, never colour alone.
 */
export type StageState = "pending" | "processing" | "completed" | "failed";

export function StageRail({
  stages,
  current,
  onSelect,
}: {
  stages: Array<{ key: string; label: string; state: StageState }>;
  current: string;
  onSelect: (key: string) => void;
}) {
  return (
    <nav aria-label="Tahap" className="tng-scroll-x flex items-stretch gap-1.5 py-1">
      {stages.map((stage, index) => {
        const isCurrent = stage.key === current;
        const reachable =
          stage.state !== "pending" || index === 0 || stages[index - 1]?.state === "completed";

        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => reachable && onSelect(stage.key)}
            aria-current={isCurrent ? "step" : undefined}
            disabled={!reachable}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-[2px] border-2 px-2.5 py-2",
              "font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.08em]",
              "transition-colors disabled:opacity-45",
              isCurrent
                ? "border-keyline bg-bone text-ink shadow-[var(--shadow-hard-sm)]"
                : "border-line bg-surface text-muted hover:border-keyline hover:text-foreground",
            )}
          >
            <span className="tabular-nums opacity-70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <StateIcon state={stage.state} />
            {stage.label}
          </button>
        );
      })}
    </nav>
  );
}

function StateIcon({ state }: { state: StageState }) {
  switch (state) {
    case "completed":
      return (
        <>
          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
          <span className="sr-only">selesai</span>
        </>
      );
    case "processing":
      return (
        <>
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          <span className="sr-only">sedang diproses</span>
        </>
      );
    case "failed":
      return (
        <>
          <TriangleAlert aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
          <span className="sr-only">gagal</span>
        </>
      );
    case "pending":
      return (
        <>
          <Circle aria-hidden="true" className="size-3" strokeWidth={2.6} />
          <span className="sr-only">belum dijalankan</span>
        </>
      );
  }
}
