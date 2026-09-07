import Link from "next/link";

import { PILLARS, PILLAR_META } from "@/types/domain";
import { PILLAR_INK } from "@/lib/pillar-ink";
import { cn } from "@/lib/utils";

/**
 * Category rail. Horizontal scroll of pillar patches at the top of the wall.
 * The active pillar re-signs itself as a filled panel, the wayfinding donation:
 * you always see which corridor you are in.
 */
export function CategoryRail({
  active,
  className,
}: {
  active?: (typeof PILLARS)[number] | "semua";
  className?: string;
}) {
  const current = active ?? "semua";

  return (
    <nav
      aria-label="Pilar konten"
      className={cn(
        // Starts at the registration rail, like every other item on the wall.
        "tng-scroll-x flex gap-2 py-2 pl-[calc(var(--rail-inset)+0.625rem)] pr-3",
        className,
      )}
    >
      <RailItem href="/" label="Semua" isActive={current === "semua"} tone="bone" />
      {PILLARS.map((pillar) => (
        <RailItem
          key={pillar}
          href={`/${pillar}`}
          label={PILLAR_META[pillar].label}
          isActive={current === pillar}
          tone={PILLAR_INK[pillar].panel}
        />
      ))}
    </nav>
  );
}

function RailItem({
  href,
  label,
  isActive,
  tone,
}: {
  href: string;
  label: string;
  isActive: boolean;
  tone: "lime" | "orange" | "bone" | "wall";
}) {
  const activeTone = {
    lime: "bg-lime text-ink",
    orange: "bg-orange text-ink",
    bone: "bg-bone text-ink",
    wall: "bg-foreground text-ink",
  }[tone];

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-[2px] border-2 border-keyline px-3",
        "font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.1em]",
        "transition-[transform,box-shadow] duration-100",
        isActive
          ? cn(activeTone, "shadow-[var(--shadow-hard-sm)]")
          : "border-line bg-surface text-muted hover:border-keyline hover:bg-surface-strong hover:text-foreground",
      )}
    >
      {/* Active state also carries a mark, so it is not colour-only. */}
      {isActive ? (
        <span aria-hidden="true" className="size-1.5 bg-ink" />
      ) : null}
      {label}
    </Link>
  );
}
