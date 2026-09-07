"use client";

import * as React from "react";
import { Bold, Heading2, Italic, Link2, List, Quote, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * Markdown editor.
 *
 * A textarea with a small toolbar, deliberately not a rich-text engine: the
 * public renderer accepts Markdown, mobile keyboards behave better with a plain
 * textarea, and no editor library lands in the bundle.
 */
type Wrap = { before: string; after: string; placeholder: string };

const WRAPS = {
  bold: { before: "**", after: "**", placeholder: "tebal" },
  italic: { before: "_", after: "_", placeholder: "miring" },
  h2: { before: "## ", after: "", placeholder: "Subjudul" },
  quote: { before: "> ", after: "", placeholder: "Kutipan" },
  list: { before: "- ", after: "", placeholder: "Poin" },
  link: { before: "[", after: "](https://)", placeholder: "teks tautan" },
} satisfies Record<string, Wrap>;

export function MarkdownEditor({
  value,
  onChange,
  id = "content-markdown",
  label = "Isi artikel (Markdown)",
  rows = 22,
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  label?: string;
  rows?: number;
  hint?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const applyWrap = (wrap: Wrap) => {
    const textarea = ref.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const inner = selected || wrap.placeholder;
    const next =
      value.slice(0, selectionStart) +
      wrap.before +
      inner +
      wrap.after +
      value.slice(selectionEnd);

    onChange(next);

    // Restore a sensible caret: inside the inserted text, ready to type over it.
    requestAnimationFrame(() => {
      const start = selectionStart + wrap.before.length;
      textarea.focus();
      textarea.setSelectionRange(start, start + inner.length);
    });
  };

  const insertVerificationFlag = () => {
    const textarea = ref.current;
    if (!textarea) return;
    const marker = "[BUTUH VERIFIKASI: jelaskan data yang diperlukan]";
    const { selectionStart } = textarea;
    const next =
      value.slice(0, selectionStart) + marker + value.slice(selectionStart);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectionStart + 20,
        selectionStart + marker.length - 1,
      );
    });
  };

  const words = value.split(/\s+/).filter(Boolean).length;

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="tng-label text-muted tabular-nums">
          {words} kata
        </span>
      </div>

      <div
        role="toolbar"
        aria-label="Format Markdown"
        aria-controls={id}
        className="flex flex-wrap gap-1.5 border-2 border-line border-b-0 bg-surface-strong p-1.5"
      >
        <ToolbarButton label="Tebal" onClick={() => applyWrap(WRAPS.bold)}>
          <Bold aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Miring" onClick={() => applyWrap(WRAPS.italic)}>
          <Italic aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Subjudul" onClick={() => applyWrap(WRAPS.h2)}>
          <Heading2 aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Kutipan" onClick={() => applyWrap(WRAPS.quote)}>
          <Quote aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Daftar" onClick={() => applyWrap(WRAPS.list)}>
          <List aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Tautan" onClick={() => applyWrap(WRAPS.link)}>
          <Link2 aria-hidden="true" />
        </ToolbarButton>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={insertVerificationFlag}
        >
          <Type aria-hidden="true" />
          Tandai verifikasi
        </Button>
      </div>

      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck
        className={cn(
          "w-full resize-y border-2 border-line bg-wall-deep px-3 py-3",
          "font-mono text-[0.875rem] leading-relaxed text-foreground",
          "outline-none transition-colors hover:border-muted/60 focus:border-lime",
        )}
      />

      <p className="text-[0.8125rem] leading-snug text-muted">
        {hint ??
          "Gunakan ## untuk subjudul. Hindari em dash dan emoji. Tandai data yang belum pasti dengan [BUTUH VERIFIKASI: ...] supaya tidak lolos ke publish."}
      </p>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-[2px] border-2 border-line bg-surface text-muted transition-colors hover:border-keyline hover:text-foreground [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
