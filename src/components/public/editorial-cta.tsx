import Link from "next/link";
import { ScribbleArrow } from "@/components/branding/scribble";
import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { cn } from "@/lib/utils";

export function EditorialCta({ className }: { className?: string }) {
  return (
    <aside aria-label="Kirim kabar ke redaksi" className={cn("mt-8", className)}>
      <BannerPanel ink="wall" lift="md" className="border-2 border-lime p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <TapePatch tone="lime" tilt="left">
              Redaksi
            </TapePatch>
            <h2 className="tng-display mt-3 text-xl sm:text-2xl text-foreground">
              Punya kabar dari Tangerang?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Kirim ke redaksi. Kami baca, kami cek, baru kami putuskan tayang atau tidak.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href="/kirim-berita"
              className={cn(
                "group inline-flex h-11 items-center gap-2 border-2 border-keyline bg-lime px-5",
                "font-display text-[0.8125rem] font-extrabold uppercase tracking-[0.12em] text-ink",
                "shadow-[3px_3px_0px_0px_#000000] transition-all duration-200 ease-out",
                "hover:bg-lime-bright hover:shadow-[4px_4px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
              )}
            >
              KIRIM BERITA
              <ScribbleArrow className="h-3 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </BannerPanel>
    </aside>
  );
}
