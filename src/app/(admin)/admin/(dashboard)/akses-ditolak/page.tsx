import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { getAuthState, displayNameOf } from "@/lib/auth";
import { isUserRole } from "@/types/domain";

export const metadata: Metadata = {
  title: "Akses ditolak",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Access denied. Reached when a signed-in user lacks the role a page requires.
 * States the required role plainly so an editor knows to ask an owner rather
 * than assuming the page is broken.
 */
export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.butuh;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const required = isUserRole(value) ? value : "editor";

  const state = await getAuthState();
  const currentRole =
    state.kind === "authenticated" ? state.context.profile.role : null;
  const name =
    state.kind === "authenticated" ? displayNameOf(state.context.profile) : null;

  return (
    <div className="grid gap-3">
      <BannerPanel ink="wall" lift="lg" grommets className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert
            aria-hidden="true"
            className="mt-1 size-6 shrink-0 text-orange"
            strokeWidth={2.4}
          />
          <div>
            <TapePatch tone="orange" tilt="left">
              Akses ditolak
            </TapePatch>
            <h1 className="tng-display mt-3 text-[1.75rem] leading-[0.94] sm:text-[2.25rem]">
              Halaman ini butuh role {required}
            </h1>
            <p className="tng-measure mt-3 text-[0.8125rem] leading-relaxed text-muted">
              {name
                ? `Kamu masuk sebagai ${name} dengan role ${currentRole}.`
                : "Sesi kamu tidak terbaca."}{" "}
              Role hanya bisa diubah owner lewat RPC role management, bukan
              dengan update langsung dari dashboard.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="primary" size="md">
                <Link href="/admin">Ke dashboard</Link>
              </Button>
              <Button asChild variant="outline" size="md">
                <Link href="/">Lihat situs</Link>
              </Button>
            </div>
          </div>
        </div>
      </BannerPanel>
    </div>
  );
}
