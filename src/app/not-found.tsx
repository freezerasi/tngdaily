import Link from "next/link";

import { BannerPanel, Wall } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { PILLARS, PILLAR_META } from "@/types/domain";
import { PILLAR_INK } from "@/lib/pillar-ink";
import { cn } from "@/lib/utils";

/**
 * 404. Rendered as a banner that has been taken down: the patch says the panel
 * is gone, and the four pillar corridors are re-signed underneath.
 */
export default function NotFound() {
  return (
    <Wall className="min-h-[70svh] px-2 py-6">
      <BannerPanel ink="wall" lift="lg" tilt="left" grommets className="p-5 sm:p-7">
        <TapePatch tone="orange" tilt="right">
          Panel dilepas
        </TapePatch>
        <h1 className="tng-display mt-4 text-[2.75rem] leading-[0.9] sm:text-[4rem]">
          404
          <br />
          Spanduknya
          <br />
          sudah turun
        </h1>
        <p className="tng-measure mt-4 text-sm leading-relaxed text-muted">
          Halaman yang kamu cari tidak ada, sudah dipindah, atau slug-nya
          berubah. Coba dari feed utama, atau langsung ke salah satu pilar di
          bawah.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="primary" size="md">
            <Link href="/">Ke feed utama</Link>
          </Button>
          <Button asChild variant="outline" size="md">
            <Link href="/cari">Cari artikel</Link>
          </Button>
        </div>
      </BannerPanel>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {PILLARS.map((pillar) => {
          const meta = PILLAR_META[pillar];
          const ink = PILLAR_INK[pillar];
          return (
            <li key={pillar}>
              <BannerPanel ink="deep" lift="sm" className="h-full">
                <Link href={`/${pillar}`} className="flex items-center gap-3 p-3">
                  <span
                    aria-hidden="true"
                    className={cn("h-10 w-1.5 shrink-0", ink.accentBar)}
                  />
                  <span>
                    <span className={cn("tng-label block", ink.accentText)}>
                      {meta.wordmark}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] text-muted">
                      {meta.tagline}
                    </span>
                  </span>
                </Link>
              </BannerPanel>
            </li>
          );
        })}
      </ul>
    </Wall>
  );
}
