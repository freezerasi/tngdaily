"use client";

import * as React from "react";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";

/**
 * Admin error boundary. Only the digest is shown: server error messages can
 * carry query fragments or internal identifiers.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Admin route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <BannerPanel ink="wall" lift="md" className="border-danger p-4 sm:p-5">
      <TapePatch tone="danger" tilt="left">
        Error
      </TapePatch>
      <h1 className="tng-display mt-3 text-[1.75rem] leading-[0.94]">
        Halaman dashboard gagal dimuat
      </h1>
      <p className="tng-measure mt-2 text-[0.8125rem] leading-relaxed text-muted">
        Kesalahan terjadi di server. Coba lagi. Kalau terus terjadi, cek policy
        RLS untuk role kamu dan status Supabase.
      </p>
      {error.digest ? (
        <p className="mt-3 w-fit border-2 border-line bg-wall-deep px-2 py-1 font-mono text-[0.75rem] text-muted">
          {error.digest}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" size="md" onClick={reset}>
          Coba lagi
        </Button>
        <Button asChild variant="outline" size="md">
          <Link href="/admin">Ke dashboard</Link>
        </Button>
      </div>
    </BannerPanel>
  );
}
