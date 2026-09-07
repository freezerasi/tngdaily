"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast host.
 *
 * Styled as a taped note so notifications belong to the same material world as
 * the rest of the interface. Severity is carried by a tape patch drawn with the
 * toast's own icon slot plus the title's colour, not by a left accent bar.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={12}
      duration={4500}
      icons={{
        success: <SeverityPatch label="OK" tone="lime" />,
        error: <SeverityPatch label="Gagal" tone="danger" />,
        warning: <SeverityPatch label="Cek" tone="orange" />,
        info: <SeverityPatch label="Info" tone="bone" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-2.5 border-2 border-keyline bg-surface-strong p-3 shadow-[var(--shadow-hard)] font-body text-sm text-foreground",
          title:
            "font-display font-extrabold uppercase tracking-[0.06em] text-xs",
          description: "text-[0.8125rem] leading-snug text-muted",
          icon: "shrink-0",
          actionButton:
            "border-2 border-keyline bg-lime px-2 py-1 font-display text-[0.6875rem] font-extrabold uppercase text-ink",
          cancelButton:
            "border-2 border-line bg-surface px-2 py-1 font-display text-[0.6875rem] font-extrabold uppercase text-muted",
          closeButton:
            "border-2 border-line bg-surface text-muted hover:text-foreground",
        },
      }}
    />
  );
}

/** Severity as a tape patch: a mark, readable without colour. */
function SeverityPatch({
  label,
  tone,
}: {
  label: string;
  tone: "lime" | "danger" | "orange" | "bone";
}) {
  const background = {
    lime: "bg-lime",
    danger: "bg-danger",
    orange: "bg-orange",
    bone: "bg-bone",
  }[tone];

  return (
    <span
      className={`tng-patch -rotate-[1.5deg] text-ink ${background}`}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
