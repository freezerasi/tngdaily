"use client";

import * as React from "react";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";

/**
 * Public error boundary. Reports nothing sensitive: the message from a server
 * exception can carry internals, so only the digest is shown, which is safe to
 * quote in a support request.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Server logs already carry the stack; this keeps the client trail minimal.
    console.error("Public route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="px-2 py-6">
      <BannerPanel ink="wall" lift="lg" tilt="right" grommets className="p-5 sm:p-7">
        <TapePatch tone="danger" tilt="left">
          Ada yang rusak
        </TapePatch>
        <h1 className="tng-display mt-4 text-[2.25rem] leading-[0.92] sm:text-[3rem]">
          Halaman ini gagal dimuat
        </h1>
        <p className="tng-measure mt-3 text-sm leading-relaxed text-muted">
          Kesalahan terjadi di sisi server. Coba muat ulang. Kalau terus terjadi,
          kirim kode di bawah ke tim TNG Daily supaya bisa dilacak.
        </p>
        {error.digest ? (
          <p className="mt-3 w-fit border-2 border-line bg-wall-deep px-2 py-1 font-mono text-[0.75rem] text-muted">
            {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" size="md" onClick={reset}>
            Coba lagi
          </Button>
          <Button asChild variant="outline" size="md">
            <Link href="/">Ke feed utama</Link>
          </Button>
        </div>
      </BannerPanel>
    </div>
  );
}
