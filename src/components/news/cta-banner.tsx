import Link from "next/link";

import { ScribbleArrow, ScribbleBurst } from "@/components/branding/scribble";
import { cn } from "@/lib/utils";

/**
 * CtaBanner: the acid-lime participation strip above the footer.
 *
 * Two marks only, both custom: a burst beside the kicker and an arrow on the
 * primary action. Nothing sits over the headline, so the largest type on the
 * strip stays clean.
 */
export function CtaBanner({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="cta-heading"
      className={cn(
        "relative overflow-hidden border-y-2 border-keyline bg-lime py-8 text-ink sm:py-10",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-3 sm:px-4 lg:flex-row lg:items-center">
        <div>
          <span className="flex items-center gap-2">
            <ScribbleBurst className="size-4 text-ink/80" weight={1.1} />
            <span className="font-display text-[0.6875rem] font-black uppercase tracking-[0.16em] text-ink/85">
              CERITA KECIL, DAMPAK NYATA
            </span>
          </span>

          <h2
            id="cta-heading"
            className="tng-display mt-2 text-[1.75rem] leading-[0.92] text-ink sm:text-[2.25rem] lg:text-[2.5rem]"
          >
            KOTA INI PUNYA BANYAK CERITA.
            <br className="hidden sm:inline" />
            {" "}JANGAN BIARKAN CUMA LEWAT.
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/kirim-berita"
            className="group inline-flex h-12 items-center gap-2 border-2 border-keyline bg-ink px-5 font-display text-[0.75rem] font-extrabold uppercase tracking-[0.12em] text-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:bg-wall-deep active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            KIRIM BERITA
            <ScribbleArrow className="h-3 text-lime transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/kirim-berita"
            className="group inline-flex h-12 items-center gap-2 border-2 border-keyline bg-transparent px-5 font-display text-[0.75rem] font-extrabold uppercase tracking-[0.12em] text-ink transition-all duration-200 ease-out hover:bg-ink/10 active:translate-x-[2px] active:translate-y-[2px]"
          >
            KIRIM TIP
            <ScribbleArrow className="h-3 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
