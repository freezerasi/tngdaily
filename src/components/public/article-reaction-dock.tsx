"use client";

import * as React from "react";

import { ReactionBar, type ReactionCounts } from "@/components/public/reaction-bar";
import { cn } from "@/lib/utils";
import type { ReactionType } from "@/types/domain";

/**
 * Minimised reaction dock for the article page. Hidden until the reader has
 * scrolled past the masthead, then parked in the thumb zone above the bottom
 * nav. Uses a passive scroll listener with rAF coalescing, so it costs nothing
 * measurable on a mid-range phone.
 */
export function ArticleReactionDock({
  articleId,
  articleTitle,
  articleUrl,
  counts,
  active,
}: {
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  counts: ReactionCounts;
  active: Record<ReactionType, boolean>;
}) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setVisible(window.scrollY > 520);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[3.5rem] z-40 px-2 transition-[opacity,transform] duration-200 lg:bottom-4",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
      // Hidden from assistive tech while off screen; the in-page bar remains.
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-2 border-2 border-keyline bg-wall-deep/97 p-2 shadow-[var(--shadow-hard)] backdrop-blur-[2px]">
        <span className="tng-label pl-1 text-muted">Reaksi</span>
        <ReactionBar
          articleId={articleId}
          articleTitle={articleTitle}
          articleUrl={articleUrl}
          counts={counts}
          active={active}
          tone="bone"
        />
      </div>
    </div>
  );
}
