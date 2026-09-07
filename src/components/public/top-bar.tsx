import Link from "next/link";
import { Search } from "lucide-react";

import { ScribbleArrow } from "@/components/branding/scribble";
import { WordMark } from "@/components/shared/word-mark";
import { PILLARS, PILLAR_META } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Masthead. Sticky, and the only sticky chrome besides the rubrik filter bar.
 *
 * Height is deliberate: 3.5rem on a phone so the viewport belongs to content,
 * growing to 4.5rem from sm where the positioning line fits beside the wordmark.
 *
 * Lucide survives here for exactly one thing: the search glyph. That is a
 * utility affordance with a universally understood shape and no brand meaning.
 * The CTA arrow is a hand mark, because a call to action is brand.
 */
export function TopBar({
  activePillar,
}: {
  activePillar?: (typeof PILLARS)[number];
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-wall/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:h-18 sm:px-4">
        <div className="flex shrink-0 items-center gap-3">
          <WordMark size="md" />
          {/* Positioning line, hidden where it would crowd the wordmark. */}
          <span className="hidden font-display text-[0.5625rem] font-bold uppercase leading-tight tracking-[0.18em] text-muted lg:block">
            LOKAL
            <br />
            KRITIS
            <br />
            RELEVAN
          </span>
        </div>

        <nav
          aria-label="Rubrik"
          className="hidden items-center justify-center gap-2 md:flex md:gap-3 lg:gap-4"
        >
          {PILLARS.map((pillar) => (
            <Link
              key={pillar}
              href={`/${pillar}`}
              aria-current={activePillar === pillar ? "page" : undefined}
              className={cn(
                "inline-flex items-center justify-center px-3 py-1.5",
                "font-display text-[0.8125rem] font-extrabold uppercase tracking-[0.14em]",
                "border transition-all duration-150 ease-out",
                activePillar === pillar
                  ? "border-lime bg-lime/10 text-lime"
                  : "border-transparent text-foreground/90 hover:border-lime hover:bg-lime/10",
              )}
            >
              {PILLAR_META[pillar].label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/cari"
            aria-label="Cari artikel"
            // 44px touch target on mobile, tightened on pointer devices.
            className="inline-flex size-11 items-center justify-center border-2 border-line bg-surface text-muted transition-all duration-200 hover:border-keyline hover:bg-surface-strong hover:text-foreground sm:size-10"
          >
            <Search aria-hidden="true" className="size-4" strokeWidth={2.4} />
          </Link>

          <Link
            href="/kontribusi"
            className={cn(
              "group inline-flex h-11 items-center gap-2 border-2 border-keyline bg-lime px-3 sm:h-10 sm:px-4",
              "font-display text-[0.75rem] font-extrabold uppercase tracking-[0.12em] text-ink",
              "shadow-[2px_2px_0px_0px_#000000] transition-all duration-200 ease-out",
              "hover:bg-lime-bright hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            )}
          >
            <span className="hidden sm:inline">KIRIM CERITA</span>
            <span className="sm:hidden">KIRIM</span>
            <ScribbleArrow className="h-2.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
