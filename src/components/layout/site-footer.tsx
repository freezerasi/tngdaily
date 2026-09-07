import Link from "next/link";

import {
  ScribbleBurst,
  ScribbleStar,
  ScribbleUnderline,
} from "@/components/branding/scribble";
import { WordMark } from "@/components/shared/word-mark";
import { PILLARS, PILLAR_META } from "@/types/domain";

/**
 * SiteFooter: Brutalist editorial close matching the mockup.
 *
 * Top Section:
 * - Col 1: Wordmark, "MEDIA LOKAL UNTUK ORANG YANG MAU MELIHAT TANGERANG LEBIH DEKAT.", "LEBIH DEKAT. LEBIH JUJUR. LEBIH KITA."
 * - Col 2: RUBRIK (Vibes, Suara, Hustle, Story, Trending)
 * - Col 3: WILAYAH (Tangerang Kota, Tangerang Selatan, Kabupaten Tangerang, Cipondoh, Lainnya)
 * - Col 4: REDAKSI (Tentang Kami, Tim Redaksi, Kode Etik, Kebijakan Privasi, Kontak)
 * - Col 5: IKUT TERLIBAT (Kirim Cerita, Kirim Tip, Kolaborasi, Jadi Kontributor, Partnership)
 * - Right: Graffiti script "TANGERANG UNTUK KITA SEMUA." with crown doodle
 *
 * Bottom Section:
 * - Left: Giant "TNG DAILY" preserving current display style (text-surface-strong tng-display)
 * - Right: Vertical divider + "LOKAL, OBSERVAN, RELEVAN, BERDAMPAK" + Copyright notice
 */
const AREAS = [
  "Tangerang Kota",
  "Tangerang Selatan",
  "Kabupaten Tangerang",
  "Cipondoh",
  "Lainnya",
] as const;

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t-2 border-keyline bg-wall-deep pb-20 text-foreground lg:pb-8">
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
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-10">
            {/* Col 1: Rubrik */}
            <div>
              <h3 className="font-display text-[0.75rem] font-extrabold uppercase tracking-widest text-muted">
                RUBRIK
              </h3>
              <ul className="mt-3.5 space-y-2 text-[0.8125rem]">
                {PILLARS.map((pillar) => (
                  <li key={pillar}>
                    <Link
                      href={`/${pillar}`}
                      className="text-foreground/80 transition-colors hover:text-lime"
                    >
                      {PILLAR_META[pillar].label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/?urut=populer"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Trending
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 2: Wilayah */}
            <div>
              <h3 className="font-display text-[0.75rem] font-extrabold uppercase tracking-widest text-muted">
                WILAYAH
              </h3>
              <ul className="mt-3.5 space-y-2 text-[0.8125rem]">
                {AREAS.map((area) => (
                  <li key={area}>
                    <Link
                      href={`/cari?q=${encodeURIComponent(area)}`}
                      className="text-foreground/80 transition-colors hover:text-lime"
                    >
                      {area}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Redaksi */}
            <div>
              <h3 className="font-display text-[0.75rem] font-extrabold uppercase tracking-widest text-muted">
                REDAKSI
              </h3>
              <ul className="mt-3.5 space-y-2 text-[0.8125rem]">
                <li>
                  <Link
                    href="/tentang"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tentang#redaksi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Tim Redaksi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tentang#etik"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kode Etik
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tentang#privasi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kebijakan Privasi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tentang#kontak"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kontak
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Ikut Terlibat */}
            <div>
              <h3 className="font-display text-[0.75rem] font-extrabold uppercase tracking-widest text-muted">
                IKUT TERLIBAT
              </h3>
              <ul className="mt-3.5 space-y-2 text-[0.8125rem]">
                <li>
                  <Link
                    href="/kontribusi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kirim Cerita
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kontribusi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kirim Tip
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tentang#kolaborasi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Kolaborasi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kontribusi"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Jadi Kontributor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tentang#partnership"
                    className="text-foreground/80 transition-colors hover:text-lime"
                  >
                    Partnership
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Hand-lettered slogan block, the footer's single brand mark. */}
          <div className="shrink-0 text-left sm:text-right">
            <div className="relative -rotate-3 inline-block select-none">
              <div className="mb-1 flex items-center justify-start gap-1.5 sm:justify-end">
                <ScribbleStar className="size-5 text-foreground/55" weight={0.9} />
                <ScribbleBurst className="size-4 text-foreground/40" weight={0.8} />
              </div>
              <span className="block font-display text-[1.25rem] font-black uppercase tracking-wider text-foreground/70 sm:text-[1.375rem]">
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

      {/* Bottom Section: Giant TNG DAILY with Current Style + Right Info */}
      <div className="border-t-2 border-line bg-wall-deep px-3 pt-4 sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          {/* Giant TNG DAILY text - user explicitly requested:
              "untuk footer teks TNG DAILY besar tetap gunakan style saat ini" */}
          <div
            aria-hidden="true"
            className="pointer-events-none select-none overflow-hidden"
          >
            <span className="tng-display block whitespace-nowrap text-[15vw] leading-[0.78] text-surface-strong lg:text-[9.5vw]">
              TNG DAILY
            </span>
          </div>

          {/* Right Info: Pillar Words & Copyright */}
          <div className="flex shrink-0 flex-wrap items-center gap-6 pb-2 sm:gap-8">
            {/* Vertical Divider */}
            <div aria-hidden="true" className="hidden h-16 w-[2px] bg-line lg:block" />

            {/* Pillar Words */}
            <div className="font-display text-[0.6875rem] font-black uppercase leading-relaxed tracking-[0.14em] text-muted">
              <div>LOKAL</div>
              <div>OBSERVAN</div>
              <div>RELEVAN</div>
              <div>BERDAMPAK</div>
            </div>

            {/* Copyright & Tagline */}
            <div className="text-right text-[0.6875rem] text-muted">
              <div className="font-display font-bold text-foreground/70">
                &copy; {currentYear} TNG DAILY
              </div>
              <div className="mt-0.5 tracking-wider">
                SEMUA CERITA PUNYA TEMPAT DI SINI.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

