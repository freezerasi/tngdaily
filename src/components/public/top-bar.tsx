import Link from "next/link";
import { Search } from "lucide-react";

import { ScribbleArrow } from "@/components/branding/scribble";
import { WordMark } from "@/components/shared/word-mark";
import { AboutDropdown } from "@/components/public/about-dropdown";
import { cn } from "@/lib/utils";

/**
 * Masthead.
 * Desktop navigation has 6 items:
 * 1. Beranda (Logo + Link)
 * 2. Kota (/suara)
 * 3. Gaya Hidup (/vibes)
 * 4. Tentang (Dropdown)
 * 5. Kontak (/kontak)
 * 6. Kirim Berita (/kirim-berita, CTA)
 *
 * Mobile relies on the bottom navigation bar; no hamburger drawer button needed.
 */
export function TopBar({
  activePillar,
}: {
  activePillar?: string;
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

        {/* Desktop Nav: Max 6 items */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden items-center justify-center gap-1.5 md:flex lg:gap-2.5"
        >
          <Link
            href="/"
            className={cn(
              "inline-flex items-center justify-center px-3 py-1.5",
              "font-display text-[0.8125rem] font-extrabold uppercase tracking-[0.14em]",
              "border border-transparent text-foreground/90 transition-all duration-150 ease-out",
              "hover:border-lime hover:bg-lime/10 hover:text-lime",
            )}
          >
            Beranda
          </Link>

          <Link
            href="/suara"
            aria-current={activePillar === "suara" ? "page" : undefined}
            className={cn(
              "inline-flex items-center justify-center px-3 py-1.5",
              "font-display text-[0.8125rem] font-extrabold uppercase tracking-[0.14em]",
              "border transition-all duration-150 ease-out",
              activePillar === "suara"
                ? "border-lime bg-lime/10 text-lime"
                : "border-transparent text-foreground/90 hover:border-lime hover:bg-lime/10",
            )}
          >
            Kota
          </Link>

          <Link
            href="/vibes"
            aria-current={activePillar === "vibes" ? "page" : undefined}
            className={cn(
              "inline-flex items-center justify-center px-3 py-1.5",
              "font-display text-[0.8125rem] font-extrabold uppercase tracking-[0.14em]",
              "border transition-all duration-150 ease-out",
              activePillar === "vibes"
                ? "border-lime bg-lime/10 text-lime"
                : "border-transparent text-foreground/90 hover:border-lime hover:bg-lime/10",
            )}
          >
            Gaya Hidup
          </Link>

          <AboutDropdown />

          <Link
            href="/kontak"
            className={cn(
              "inline-flex items-center justify-center px-3 py-1.5",
              "font-display text-[0.8125rem] font-extrabold uppercase tracking-[0.14em]",
              "border border-transparent text-foreground/90 transition-all duration-150 ease-out",
              "hover:border-lime hover:bg-lime/10 hover:text-lime",
            )}
          >
            Kontak
          </Link>
        </nav>

        {/* Right tools: Search & Kirim Berita CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/cari"
            aria-label="Cari artikel"
            className="inline-flex size-11 items-center justify-center border-2 border-line bg-surface text-muted transition-all duration-200 hover:border-keyline hover:bg-surface-strong hover:text-foreground sm:size-10"
          >
            <Search aria-hidden="true" className="size-4" strokeWidth={2.4} />
          </Link>

          <Link
            href="/kirim-berita"
            className={cn(
              "group inline-flex h-11 items-center gap-2 border-2 border-keyline bg-lime px-3 sm:h-10 sm:px-4",
              "font-display text-[0.75rem] font-extrabold uppercase tracking-[0.12em] text-ink",
              "shadow-[2px_2px_0px_0px_#000000] transition-all duration-200 ease-out",
              "hover:bg-lime-bright hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            )}
          >
            <span className="hidden sm:inline">KIRIM BERITA</span>
            <span className="sm:hidden">KIRIM</span>
            <ScribbleArrow className="h-2.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
