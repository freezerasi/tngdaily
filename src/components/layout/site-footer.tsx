import Link from "next/link";

import {
  ScribbleBurst,
  ScribbleStar,
  ScribbleUnderline,
} from "@/components/branding/scribble";
import { WordMark } from "@/components/shared/word-mark";

/**
 * SiteFooter: 4-column brutalist editorial footer matching the spec.
 *
 * Kolom 1 — TNG Daily: Tentang Kami, Redaksi, Kontak, Kirim Berita
 * Kolom 2 — Standar redaksi: Kode Etik, Pedoman Redaksi, Disclaimer
 * Kolom 3 — Legal: Kebijakan Privasi, Syarat dan Ketentuan
 * Kolom 4 — Slogan: Tangerang Milik Kita Semua (exact original style)
 *
 * Bottom: Giant TNG DAILY watermark, pillar words, and official legal copyright notice.
 */
export function SiteFooter() {
  return (
    <footer className="relative border-t-2 border-keyline bg-wall-deep pb-24 text-foreground lg:pb-8">
      {/* Top Navigation Row */}
      <div className="mx-auto max-w-7xl px-3 py-10 sm:px-4">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">
          {/* Brand & Tagline */}
          <div className="max-w-xs shrink-0">
            <WordMark size="md" asLink={false} />
            <p className="mt-4 font-display text-[0.8125rem] font-bold uppercase leading-snug tracking-wider text-foreground">
              MEDIA LOKAL UNTUK ORANG YANG MAU MELIHAT TANGERANG LEBIH DEKAT.
            </p>
            <p className="mt-3 font-display text-[0.6875rem] font-extrabold uppercase tracking-widest text-muted">
              LEBIH DEKAT. LEBIH JUJUR. LEBIH KITA.
            </p>
          </div>

          {/* 4 Nav Columns */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-10 lg:pl-10">
            {/* Kolom 1 — TNG Daily */}
            <div>
              <h3 className="font-display text-[0.75rem] font-extrabold uppercase tracking-widest text-bone">
                TNG DAILY
              </h3>
              <ul className="mt-3.5 space-y-2 text-[0.8125rem]">
                <li>
                  <Link
                    href="/tentang-kami"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link
                    href="/redaksi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Redaksi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kontak"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kontak
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kirim-berita"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kirim Berita
                  </Link>
                </li>
                <li>
                  <Link
                    href="/partner"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Partner Stories (Advertorial)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kolom 2 — Standar Redaksi */}
            <div>
              <h3 className="font-display text-[0.75rem] font-extrabold uppercase tracking-widest text-bone">
                STANDAR REDAKSI
              </h3>
              <ul className="mt-3.5 space-y-2 text-[0.8125rem]">
                <li>
                  <Link
                    href="/kode-etik"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kode Etik
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pedoman-redaksi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Pedoman Redaksi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/disclaimer"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Disclaimer
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kolom 3 — Legal */}
            <div>
              <h3 className="font-display text-[0.75rem] font-extrabold uppercase tracking-widest text-bone">
                LEGAL
              </h3>
              <ul className="mt-3.5 space-y-2 text-[0.8125rem]">
                <li>
                  <Link
                    href="/kebijakan-privasi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kebijakan Privasi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/syarat-ketentuan"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Syarat dan Ketentuan
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kolom 4 — Slogan: Tangerang Milik Kita Semua */}
            <div className="flex items-start justify-start pt-1">
              <div className="relative -rotate-2 select-none">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <ScribbleStar className="size-4.5 text-foreground/50" weight={0.9} />
                  <ScribbleBurst className="size-3.5 text-foreground/35" weight={0.8} />
                </div>
                <span className="block font-display text-[1.125rem] font-black uppercase leading-snug tracking-wider text-foreground/75 sm:text-[1.25rem]">
                  TANGERANG
                  <br />
                  MILIK
                  <br />
                  KITA SEMUA.
                </span>
                <ScribbleUnderline className="mt-1 h-2.5 w-full text-lime/70" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Giant TNG DAILY + Right Info */}
      <div className="border-t-2 border-line bg-wall-deep px-3 pt-6 pb-6 sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          {/* Left: Giant TNG DAILY display */}
          <div
            aria-hidden="true"
            className="pointer-events-none select-none overflow-hidden"
          >
            <span className="tng-display block whitespace-nowrap text-[14vw] leading-[0.8] text-surface-strong sm:text-[10vw] lg:text-[8vw]">
              TNG DAILY
            </span>
          </div>

          {/* Right Info: Pillar Words & Copyright */}
          <div className="flex shrink-0 flex-wrap items-center gap-5 sm:gap-8">
            <div aria-hidden="true" className="hidden h-16 w-[2px] bg-line lg:block" />

            <div className="font-display text-[0.6875rem] font-black uppercase leading-relaxed tracking-[0.14em] text-muted">
              <div>LOKAL</div>
              <div>OBSERVAN</div>
              <div>RELEVAN</div>
              <div>BERDAMPAK</div>
            </div>

            <div className="text-left sm:text-right text-[0.6875rem] text-muted max-w-sm">
              <div className="font-display font-bold text-foreground/80">
                &copy; 2026 TNG Daily. Media lokal Tangerang.
              </div>
              <div className="mt-1 leading-relaxed text-muted">
                Berpedoman pada UU Pers, Kode Etik Jurnalistik, dan Pedoman Pemberitaan Media Siber.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
