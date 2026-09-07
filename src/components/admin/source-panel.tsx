"use client";

import * as React from "react";
import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BannerPanel } from "@/components/shared/banner-panel";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  addArticleSourceAction,
  removeArticleSourceAction,
} from "@/app/(admin)/admin/(dashboard)/actions";
import type { ArticleSourceView } from "@/lib/data/types";

/**
 * Source and attribution panel.
 *
 * Sources are first-class rows, not free text in the body, so the public article
 * can render them and the Quality Gate can check attribution against them.
 */
export function SourcePanel({
  articleId,
  sources,
  onChange,
}: {
  articleId: string;
  sources: ArticleSourceView[];
  onChange: (next: ArticleSourceView[]) => void;
}) {
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [note, setNote] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const add = async () => {
    if (name.trim().length < 2 || url.trim().length < 8) {
      toast.error("Nama sumber dan URL wajib diisi.");
      return;
    }

    setPending(true);
    const result = await addArticleSourceAction({
      articleId,
      sourceName: name.trim(),
      sourceUrl: url.trim(),
      attributionText: note.trim(),
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.message ?? "Sumber gagal disimpan.");
      return;
    }

    // Optimistic row with a temporary id; the server list refreshes on reload.
    onChange([
      ...sources,
      {
        id: `pending-${Date.now()}`,
        sourceName: name.trim(),
        sourceUrl: url.trim(),
        attributionText: note.trim() || null,
        sourceType: "reference",
      },
    ]);
    setName("");
    setUrl("");
    setNote("");
    toast.success("Sumber ditambahkan.");
  };

  const remove = async (sourceId: string) => {
    if (sourceId.startsWith("pending-")) {
      onChange(sources.filter((source) => source.id !== sourceId));
      return;
    }

    const result = await removeArticleSourceAction(sourceId);
    if (!result.ok) {
      toast.error(result.message ?? "Sumber gagal dihapus.");
      return;
    }
    onChange(sources.filter((source) => source.id !== sourceId));
  };

  return (
    <BannerPanel ink="deep" lift="sm" className="grid gap-3 p-3 sm:p-4">
      <div>
        <h2 className="tng-label text-muted">Sumber dan atribusi</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted">
          Sumber yang dipakai wajib disebut di dalam badan artikel, dan dicatat di
          sini supaya tampil di panel sumber halaman publik.
        </p>
      </div>

      {sources.length > 0 ? (
        <ul className="grid gap-2">
          {sources.map((source) => (
            <li
              key={source.id}
              className="flex items-start gap-2 border-2 border-line bg-wall-deep p-2.5"
            >
              <span className="min-w-0 flex-1">
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener nofollow"
                  className="inline-flex items-center gap-1.5 font-display text-[0.875rem] font-extrabold text-lime hover:underline hover:decoration-2 hover:underline-offset-4"
                >
                  {source.sourceName}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3"
                    strokeWidth={3}
                  />
                </a>
                <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
                  {source.sourceUrl}
                </span>
                {source.attributionText ? (
                  <span className="mt-1 block text-[0.75rem] text-muted">
                    {source.attributionText}
                  </span>
                ) : null}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus sumber ${source.sourceName}`}
                onClick={() => void remove(source.id)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.8125rem] text-muted">Belum ada sumber tercatat.</p>
      )}

      <div className="grid gap-2 border-t-2 border-line pt-3 sm:grid-cols-2">
        <Field label="Nama media atau sumber" htmlFor="source-name">
          <Input
            id="source-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nama media"
            maxLength={120}
          />
        </Field>
        <Field label="URL sumber" htmlFor="source-url">
          <Input
            id="source-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
        </Field>
        <Field
          label="Catatan atribusi"
          htmlFor="source-note"
          className="sm:col-span-2"
          hint="Contoh: data jumlah armada dikutip dari laporan tahunan."
        >
          <Input
            id="source-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={400}
          />
        </Field>
      </div>

      <Button
        variant="outline"
        size="md"
        disabled={pending}
        onClick={() => void add()}
      >
        <Plus aria-hidden="true" />
        Tambah sumber
      </Button>
    </BannerPanel>
  );
}
