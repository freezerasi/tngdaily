"use client";

import * as React from "react";
import { Bookmark, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/utils";
import type { ReactionType } from "@/types/domain";

/**
 * ReactionBar. Sits in the banner hem, inside the thumb zone.
 *
 * Optimistic locally, authoritative on the server: the route owns the anonymous
 * session cookie, so no identifier is generated in the browser.
 */
export interface ReactionCounts {
  like: number;
  save: number;
  share: number;
}

export function ReactionBar({
  articleId,
  articleTitle,
  articleUrl,
  counts,
  active,
  tone = "ink",
  className,
}: {
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  counts: ReactionCounts;
  active: Record<ReactionType, boolean>;
  tone?: "ink" | "bone";
  className?: string;
}) {
  const [state, setState] = React.useState({ counts, active });
  const [pending, setPending] = React.useState<ReactionType | null>(null);

  const send = React.useCallback(
    async (type: ReactionType, nextActive: boolean) => {
      setPending(type);
      try {
        const response = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, type, active: nextActive }),
        });

        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          const message =
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof (body as { error: unknown }).error === "string"
              ? (body as { error: string }).error
              : "Reaksi gagal disimpan. Coba lagi.";
          throw new Error(message);
        }

        const payload = (await response.json()) as {
          counts?: Partial<ReactionCounts>;
        };
        if (payload.counts) {
          setState((prev) => ({
            active: prev.active,
            counts: { ...prev.counts, ...payload.counts },
          }));
        }
      } catch (error) {
        // Roll back the optimistic flip.
        setState((prev) => ({
          counts: {
            ...prev.counts,
            [type]: Math.max(0, prev.counts[type] + (nextActive ? -1 : 1)),
          },
          active: { ...prev.active, [type]: !nextActive },
        }));
        toast.error(
          error instanceof Error ? error.message : "Reaksi gagal disimpan.",
        );
      } finally {
        setPending(null);
      }
    },
    [articleId],
  );

  const toggle = (type: ReactionType) => {
    const nextActive = !state.active[type];
    setState((prev) => ({
      counts: {
        ...prev.counts,
        [type]: Math.max(0, prev.counts[type] + (nextActive ? 1 : -1)),
      },
      active: { ...prev.active, [type]: nextActive },
    }));
    void send(type, nextActive);
  };

  const share = async () => {
    const shareData = {
      title: articleTitle,
      text: articleTitle,
      url: articleUrl,
    };

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(articleUrl);
        toast.success("Link disalin", { description: articleUrl });
      }
    } catch {
      // A cancelled share sheet is not an error worth reporting.
      return;
    }

    if (!state.active.share) {
      setState((prev) => ({
        counts: { ...prev.counts, share: prev.counts.share + 1 },
        active: { ...prev.active, share: true },
      }));
      void send("share", true);
    }
  };

  const onInk = tone === "ink";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        className,
      )}
    >
      <ReactionButton
        label="Suka"
        pressedLabel="Batalkan suka"
        icon={Heart}
        count={state.counts.like}
        isActive={state.active.like}
        isPending={pending === "like"}
        onInk={onInk}
        activeClass="bg-danger text-ink"
        onClick={() => toggle("like")}
      />
      <ReactionButton
        label="Simpan"
        pressedLabel="Hapus simpanan"
        icon={Bookmark}
        count={state.counts.save}
        isActive={state.active.save}
        isPending={pending === "save"}
        onInk={onInk}
        activeClass="bg-lime text-ink"
        onClick={() => toggle("save")}
      />
      <ReactionButton
        label="Bagikan"
        pressedLabel="Bagikan lagi"
        icon={Share2}
        count={state.counts.share}
        isActive={state.active.share}
        isPending={pending === "share"}
        onInk={onInk}
        activeClass="bg-bone text-ink"
        onClick={() => void share()}
      />
    </div>
  );
}

function ReactionButton({
  label,
  pressedLabel,
  icon: Icon,
  count,
  isActive,
  isPending,
  onInk,
  activeClass,
  onClick,
}: {
  label: string;
  pressedLabel: string;
  icon: typeof Heart;
  count: number;
  isActive: boolean;
  isPending: boolean;
  onInk: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={isActive ? pressedLabel : label}
      disabled={isPending}
      className={cn(
        "inline-flex h-11 min-w-[3.25rem] items-center justify-center gap-1.5 rounded-[3px] border-2 px-2.5",
        "font-display text-[0.6875rem] font-extrabold tabular-nums tracking-[0.04em]",
        "transition-[transform,box-shadow,background-color] duration-100",
        "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        "disabled:opacity-70",
        isActive
          ? cn("border-keyline shadow-[var(--shadow-hard-sm)]", activeClass)
          : onInk
            ? "border-ink/35 bg-ink/8 text-ink hover:bg-ink/15"
            : "border-line bg-surface text-foreground hover:bg-surface-strong",
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-4"
        strokeWidth={2.4}
        fill={isActive ? "currentColor" : "none"}
      />
      <span>{formatCompactNumber(count)}</span>
    </button>
  );
}
