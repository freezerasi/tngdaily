import * as React from "react";

import { cn } from "@/lib/utils";
import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";

/**
 * EmptyState: a blank banner with a taped note. Used for every empty list,
 * every unconfigured integration, and every zero-result filter, so the reader
 * or editor always gets a reason and a next action.
 */
export function EmptyState({
  patch,
  title,
  description,
  action,
  tone = "wall",
  className,
}: {
  patch: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "wall" | "bone" | "deep";
  className?: string;
}) {
  return (
    <BannerPanel
      ink={tone}
      lift="sm"
      className={cn(
        "flex flex-col items-start gap-3 border-dashed p-5 sm:p-6",
        className,
      )}
    >
      <TapePatch tone={tone === "bone" ? "wall" : "tape"} tilt="left">
        {patch}
      </TapePatch>
      <h2 className="tng-display-tight text-xl sm:text-2xl">{title}</h2>
      {description ? (
        <p
          className={cn(
            "tng-measure text-sm leading-relaxed",
            tone === "bone" ? "text-ink/75" : "text-muted",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </BannerPanel>
  );
}

/**
 * SetupNotice: shown when a feature's credentials are missing. Deliberately
 * explicit about which env var is absent, because a silent empty screen is the
 * worst failure mode for a self-hosted CMS.
 */
export function SetupNotice({
  title,
  envKeys,
  description,
  docHint,
  className,
}: {
  title: string;
  envKeys: readonly string[];
  description: string;
  docHint?: string;
  className?: string;
}) {
  return (
    <BannerPanel
      ink="deep"
      lift="sm"
      className={cn("border-orange p-5", className)}
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2">
        <TapePatch tone="orange" tilt="left">
          Perlu konfigurasi
        </TapePatch>
        <h2 className="tng-display-tight text-lg">{title}</h2>
      </div>
      <p className="tng-measure mt-3 text-sm leading-relaxed text-muted">
        {description}
      </p>
      <ul className="mt-3 grid gap-1.5">
        {envKeys.map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2 shrink-0 bg-orange" />
            <code className="font-mono text-[0.8125rem] text-foreground">
              {key}
            </code>
          </li>
        ))}
      </ul>
      {docHint ? (
        <p className="mt-3 border-t-2 border-line pt-3 text-[0.8125rem] text-muted">
          {docHint}
        </p>
      ) : null}
    </BannerPanel>
  );
}
