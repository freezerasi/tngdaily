import Link from "next/link";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Pillar } from "@/types/domain";

/**
 * Tag filter. Typed URL search params rather than client state, so a filtered
 * pillar view is shareable and still server-rendered.
 */
export function TagFilterRail({
  pillar,
  tags,
  activeTag,
}: {
  pillar: Pillar;
  tags: string[];
  activeTag?: string;
}) {
  return (
    <div className="tng-scroll-x -mr-3 flex items-center gap-2 py-1 pl-[calc(var(--rail-inset)+0.625rem)]">
      <span className="tng-label shrink-0 text-muted">Tag</span>
      {tags.map((tag) => {
        const isActive = activeTag === tag;
        return (
          <Link
            key={tag}
            href={isActive ? `/${pillar}` : `/${pillar}?tag=${encodeURIComponent(tag)}`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[2px] border-2 px-2.5",
              "font-body text-[0.75rem] font-semibold lowercase transition-colors",
              isActive
                ? "border-keyline bg-bone text-ink shadow-[var(--shadow-hard-sm)]"
                : "border-line bg-surface text-muted hover:border-keyline hover:text-foreground",
            )}
          >
            #{tag}
            {isActive ? (
              <X aria-hidden="true" className="size-3" strokeWidth={3} />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
