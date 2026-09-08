"use client";

import * as React from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

import { TapePatch } from "@/components/shared/tape-patch";
import { cn } from "@/lib/utils";

interface ArticleShareButtonsProps {
  title: string;
  url?: string;
  className?: string;
}

function resolveShareUrl(url?: string): string {
  if (url) {
    if (url.startsWith("http")) return url;
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://tngdaily.com";
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  if (typeof window !== "undefined") {
    return window.location.href;
  }
  return "https://tngdaily.com";
}

export function ArticleShareButtons({
  title,
  url,
  className,
}: ArticleShareButtonsProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShareWindow = (channel: "whatsapp" | "twitter" | "facebook") => {
    const targetUrl = resolveShareUrl(url);
    let href = "";

    if (channel === "whatsapp") {
      href = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} — ${targetUrl}`)}`;
    } else if (channel === "twitter") {
      href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(targetUrl)}`;
    } else if (channel === "facebook") {
      href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}`;
    }

    if (href && typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopy = async () => {
    const targetUrl = resolveShareUrl(url);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(targetUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    const targetUrl = resolveShareUrl(url);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url: targetUrl,
        });
      } catch {
        // User cancelled or not supported
      }
    }
  };

  return (
    <div
      className={cn(
        "my-8 border-y-2 border-dashed border-line bg-surface/50 px-3 py-4 sm:px-4 sm:py-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TapePatch tone="lime" tilt="left" size="sm">
            BAGIKAN
          </TapePatch>
          <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
            Sebarkan cerita ini:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={() => handleShareWindow("whatsapp")}
            aria-label="Bagikan ke WhatsApp"
            className="inline-flex items-center gap-1.5 border-2 border-keyline bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:-translate-y-0.5 hover:border-lime hover:bg-surface-strong hover:text-lime hover:shadow-[var(--shadow-hard-sm)]"
          >
            <MessageCircle className="size-3.5 text-lime" />
            <span>WhatsApp</span>
          </button>

          {/* X / Twitter */}
          <button
            type="button"
            onClick={() => handleShareWindow("twitter")}
            aria-label="Bagikan ke X Twitter"
            className="inline-flex items-center gap-1.5 border-2 border-keyline bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:-translate-y-0.5 hover:border-lime hover:bg-surface-strong hover:text-lime hover:shadow-[var(--shadow-hard-sm)]"
          >
            <span className="font-sans text-xs font-black">𝕏</span>
            <span>Post</span>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={() => handleShareWindow("facebook")}
            aria-label="Bagikan ke Facebook"
            className="inline-flex items-center gap-1.5 border-2 border-keyline bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:-translate-y-0.5 hover:border-lime hover:bg-surface-strong hover:text-lime hover:shadow-[var(--shadow-hard-sm)]"
          >
            <span className="font-sans text-xs font-bold">f</span>
            <span>Share</span>
          </button>

          {/* Salin Tautan */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Salin tautan artikel"
            className={cn(
              "inline-flex items-center gap-1.5 border-2 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-all",
              copied
                ? "border-keyline bg-lime text-ink shadow-[var(--shadow-hard-sm)]"
                : "border-keyline bg-surface text-foreground hover:-translate-y-0.5 hover:border-lime hover:bg-surface-strong hover:shadow-[var(--shadow-hard-sm)]",
            )}
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-ink" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Salin Tautan</span>
              </>
            )}
          </button>

          {/* Native Share button for mobile devices */}
          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <button
              type="button"
              onClick={handleNativeShare}
              aria-label="Buka menu berbagi perangkat"
              className="inline-flex sm:hidden items-center gap-1.5 border-2 border-keyline bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-strong"
            >
              <Share2 className="size-3.5" />
              <span>Lainnya</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
