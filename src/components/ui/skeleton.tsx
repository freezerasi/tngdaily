import * as React from "react";

import { cn } from "@/lib/utils";

/** Low-contrast skeleton for admin surfaces and long-running panels. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("tng-shimmer rounded-[3px]", className)}
      {...props}
    />
  );
}

export function SoftPageLoading({ label = "Memuat TNG Daily" }: { label?: string }) {
  return (
    <div
      className="grid min-h-[45svh] place-items-center px-4 py-10"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-muted">
        <span className="sr-only">{label}</span>
        <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-lime" />
        <span
          aria-hidden="true"
          className="h-2 w-2 animate-pulse rounded-full bg-orange [animation-delay:150ms]"
        />
        <span
          aria-hidden="true"
          className="h-2 w-2 animate-pulse rounded-full bg-bone [animation-delay:300ms]"
        />
      </div>
    </div>
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
