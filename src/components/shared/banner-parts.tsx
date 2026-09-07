import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Grommet: the eyelet punched through a banner corner. Four of them signal that
 * the panel is a real hung object rather than a rounded card.
 */
export function Grommets({
  className,
  inset = "0.5rem",
}: {
  className?: string;
  inset?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 z-20", className)}
      style={{ ["--g" as string]: inset }}
    >
      <span className="tng-grommet absolute left-[var(--g)] top-[var(--g)]" />
      <span className="tng-grommet absolute right-[var(--g)] top-[var(--g)]" />
      <span className="tng-grommet absolute bottom-[var(--g)] left-[var(--g)]" />
      <span className="tng-grommet absolute right-[var(--g)] bottom-[var(--g)]" />
    </span>
  );
}

/**
 * Hem: the double-stitched edge of the banner. Used at the top and bottom of a
 * panel, and as the seat the reaction bar sits in.
 */
export function Hem({
  className,
  children,
  edge = "bottom",
}: {
  className?: string;
  children?: React.ReactNode;
  edge?: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "relative w-full",
        edge === "bottom" ? "border-t-2 border-keyline" : "border-b-2 border-keyline",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "tng-hem-stitch absolute left-0 right-0",
          edge === "bottom" ? "top-1" : "bottom-1",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "tng-hem-stitch absolute left-0 right-0",
          edge === "bottom" ? "top-2.5" : "bottom-2.5",
        )}
      />
      {children}
    </div>
  );
}

/**
 * Read cost. Always occupies the same slot on every banner, so the reader can
 * find the number without looking for it. Terminal wayfinding donation.
 */
export function ReadCost({
  minutes,
  className,
  tone = "ink",
}: {
  minutes: number;
  className?: string;
  tone?: "ink" | "bone";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline gap-1 border-l-2 pl-2 tabular-nums",
        tone === "ink"
          ? "border-ink/35 text-ink/80"
          : "border-line text-muted",
        className,
      )}
    >
      <span className="font-display text-sm font-extrabold leading-none">
        {minutes}
      </span>
      <span className="tng-label text-[0.5625rem] leading-none opacity-80">
        menit
      </span>
    </span>
  );
}
