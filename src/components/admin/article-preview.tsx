"use client";

import * as React from "react";
import { Eye, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TapePatch } from "@/components/shared/tape-patch";
import { renderPreviewAction } from "@/app/(admin)/admin/(dashboard)/preview-action";
import { PILLAR_META, type Pillar } from "@/types/domain";
import { onPanelText, PILLAR_INK } from "@/lib/pillar-ink";
import { cn } from "@/lib/utils";

/**
 * Article preview.
 *
 * Markdown is rendered and sanitised on the server through a Server Action, so
 * the preview uses exactly the same pipeline as the public page and no Markdown
 * parser is shipped to the browser.
 */
export function ArticlePreview({
  title,
  dek,
  markdown,
  pillar,
  coverImageUrl,
  authorName,
}: {
  title: string;
  dek: string;
  markdown: string;
  pillar: Pillar;
  coverImageUrl: string;
  authorName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [html, setHtml] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await renderPreviewAction(markdown);
      setHtml(result.html);
    } finally {
      setLoading(false);
    }
  };

  const ink = PILLAR_INK[pillar];
  const text = onPanelText(pillar);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="bone" size="md" block>
          <Eye aria-hidden="true" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent size="lg" aria-describedby="preview-desc">
        <DialogHeader>
          <DialogTitle>Pratinjau artikel</DialogTitle>
          <DialogDescription id="preview-desc">
            Tampilan mendekati versi publik. Markdown dirender dan disanitasi di
            server, sama seperti halaman asli.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="mx-auto max-w-[26rem] border-2 border-keyline bg-wall p-2 shadow-[var(--shadow-hard)]">
            <div
              className={cn(
                "border-2 border-keyline p-3",
                ink.panel === "lime" && "bg-lime",
                ink.panel === "orange" && "bg-orange",
                ink.panel === "bone" && "bg-bone",
                ink.panel === "wall" && "bg-surface",
              )}
            >
              <TapePatch tone={ink.patch} tilt="left" size="sm">
                {PILLAR_META[pillar].label}
              </TapePatch>
              <h2
                className={cn(
                  "tng-display mt-2 text-[1.75rem] leading-[0.94]",
                  text.heading,
                )}
              >
                {title || "Tanpa judul"}
              </h2>
              {dek ? (
                <p className={cn("mt-2 text-sm leading-relaxed", text.body)}>
                  {dek}
                </p>
              ) : null}
              <p className={cn("mt-3 text-[0.75rem]", text.muted)}>
                {authorName}
              </p>
            </div>

            {coverImageUrl ? (
              // Preview only, so a plain img avoids optimizer round trips.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageUrl}
                alt=""
                className="mt-2 w-full border-2 border-keyline"
              />
            ) : null}

            <div className="mt-3 px-1">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Merender pratinjau
                </p>
              ) : html ? (
                <div
                  className="tng-prose"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <p className="text-sm text-muted">Belum ada isi artikel.</p>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
