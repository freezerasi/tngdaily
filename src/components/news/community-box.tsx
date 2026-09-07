import Link from "next/link";

import { ScribbleArrow, ScribbleMegaphone } from "@/components/branding/scribble";
import { cn } from "@/lib/utils";

/**
 * CommunityCard: the participation tile inside the feed grid.
 *
 * Deliberately not a live form. A bare input in a feed grid collects
 * submissions without consent, without the moderation notice, and without the
 * rate limit that /api/contributions enforces. This routes to the real form,
 * which does all three.
 *
 * The messaging buttons point at /tentang#kanal, which states that the channels
 * are not live yet, rather than at accounts we do not control.
 */
export function CommunityBox({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="community-heading"
      className={cn(
        "relative flex h-full flex-col justify-between gap-3 border-2 border-lime bg-wall-deep p-4 shadow-[var(--shadow-hard)] sm:p-5",
        className,
      )}
    >
      {/* Diagonal hatch, the same mark used for non-evidentiary media, at low
          opacity: this tile is an invitation, not an article. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-lime) 0 2px, transparent 2px 9px)",
        }}
      />

      <div className="relative">
        {/* Hand-drawn megaphone. The section's single brand mark. */}
        <ScribbleMegaphone className="h-9 w-11 text-lime" weight={1.05} />

        <h2
          id="community-heading"
          className="tng-display mt-3 text-[1.5rem] leading-[0.96] sm:text-[1.875rem]"
        >
          PUNYA CERITA
          <br />
          DARI TANGERANG?
        </h2>

        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
          Kirim kabar, rekomendasi, foto, atau isu dari sekitarmu. Semua masuk
          moderasi editor, tidak ada yang tayang otomatis, dan kamu boleh pakai
          nama pena.
        </p>
      </div>

      <div className="relative grid gap-2">
        <Link
          href="/kontribusi"
          className={cn(
            "group inline-flex h-11 items-center justify-between gap-2 border-2 border-keyline bg-lime px-3",
            "font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.1em] text-ink",
            "shadow-[3px_3px_0px_0px_#000000] transition-all duration-200 ease-out",
            "hover:bg-lime-bright active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
          )}
        >
          KIRIM CERITA
          <ScribbleArrow className="h-3 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/tentang#kanal"
            className="inline-flex h-11 items-center justify-center border-2 border-line bg-surface font-display text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-muted transition-all duration-200 hover:border-keyline hover:text-foreground"
          >
            WHATSAPP
          </Link>
          <Link
            href="/tentang#kanal"
            className="inline-flex h-11 items-center justify-center border-2 border-line bg-surface font-display text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-muted transition-all duration-200 hover:border-keyline hover:text-foreground"
          >
            TELEGRAM
          </Link>
        </div>

        <p className="text-[0.6875rem] leading-snug text-muted">
          Kanal pesan resmi dipasang di halaman kanal begitu masing-masing akun
          aktif, jadi kamu tidak diarahkan ke akun yang bukan milik kami.
        </p>
      </div>
    </section>
  );
}
