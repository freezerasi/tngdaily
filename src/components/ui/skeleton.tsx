import * as React from "react";

import { cn } from "@/lib/utils";

/** Skeleton, not spinner. Shimmer runs along the banner grain. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("tng-shimmer rounded-[3px] border-2 border-line", className)}
      {...props}
    />
  );
}

/** Feed-shaped placeholder used by every public loading.tsx. */
export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat feed TNG Daily</span>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="tng-banner relative flex min-h-[72svh] flex-col justify-between bg-surface p-4"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
          <div className="grid gap-3">
            <Skeleton className="h-9 w-[92%]" />
            <Skeleton className="h-9 w-[78%]" />
            <Skeleton className="h-9 w-[60%]" />
            <Skeleton className="mt-2 h-4 w-[85%] border-0" />
            <Skeleton className="h-4 w-[70%] border-0" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}
