"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, TriangleAlert } from "lucide-react";

import { BannerPanel } from "@/components/shared/banner-panel";
import { Button } from "@/components/ui/button";
import { TapePatch } from "@/components/shared/tape-patch";

/**
 * AI readiness notice.
 *
 * Shows the resolved fallback chain before an editor writes a brief, so a
 * missing provider is visible up front rather than after a long form. Provider
 * names only: no keys, no previews.
 */
interface ChainEntry {
  order: number;
  providerName: string;
  model: string;
  isLocalFallback: boolean;
}

export function AiChainNotice() {
  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "ready"; chain: ChainEntry[]; storeMessage: string }
    | { kind: "blocked"; message: string; storeMessage: string }
  >({ kind: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/ai/test");
        const body = (await response.json()) as {
          ready?: boolean;
          chain?: ChainEntry[];
          secretStore?: { message?: string };
          error?: string;
        };

        if (cancelled) return;

        if (!response.ok) {
          setState({
            kind: "blocked",
            message: body.error ?? "Status AI tidak bisa dibaca.",
            storeMessage: "",
          });
          return;
        }

        if (!body.ready || !body.chain || body.chain.length === 0) {
          setState({
            kind: "blocked",
            message:
              "Belum ada provider AI aktif. Tambahkan provider dan API key di Konfigurasi AI sebelum memakai studio.",
            storeMessage: body.secretStore?.message ?? "",
          });
          return;
        }

        setState({
          kind: "ready",
          chain: body.chain,
          storeMessage: body.secretStore?.message ?? "",
        });
      } catch {
        if (!cancelled) {
          setState({
            kind: "blocked",
            message: "Status AI tidak bisa dibaca.",
            storeMessage: "",
          });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <BannerPanel ink="deep" lift="sm" className="p-3">
        <p className="flex items-center gap-2 text-[0.8125rem] text-muted">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memeriksa status provider AI
        </p>
      </BannerPanel>
    );
  }

  if (state.kind === "blocked") {
    return (
      <BannerPanel ink="deep" lift="sm" className="border-orange p-3">
        <div className="flex items-start gap-2">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-orange"
            strokeWidth={2.4}
          />
          <div className="min-w-0">
            <h2 className="tng-display-tight text-base">AI belum siap dipakai</h2>
            <p className="tng-measure mt-1 text-[0.8125rem] leading-relaxed text-muted">
              {state.message}
            </p>
            {state.storeMessage ? (
              <p className="mt-1.5 text-[0.75rem] text-muted">
                {state.storeMessage}
              </p>
            ) : null}
            <Button asChild variant="secondary" size="sm" className="mt-3">
              <Link href="/admin/ai">Buka Konfigurasi AI</Link>
            </Button>
          </div>
        </div>
      </BannerPanel>
    );
  }

  return (
    <BannerPanel ink="deep" lift="sm" className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <TapePatch tone="lime" size="sm">
          AI siap
        </TapePatch>
        <span className="tng-label text-muted">Urutan fallback</span>
      </div>
      <ol className="mt-2 flex flex-wrap gap-1.5">
        {state.chain.map((entry) => (
          <li key={`${entry.order}-${entry.providerName}`}>
            <TapePatch
              tone={entry.isLocalFallback ? "orange" : "outline"}
              size="sm"
            >
              {entry.order}. {entry.providerName}
              <span className="font-body font-medium normal-case tracking-normal">
                {entry.model}
              </span>
            </TapePatch>
          </li>
        ))}
      </ol>
    </BannerPanel>
  );
}
