"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { CloudinaryImage } from "@/components/shared/cloudinary-image";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { TapePatch } from "@/components/shared/tape-patch";
import { formatBytes } from "@/lib/utils";

/**
 * Image picker: local upload plus stock search.
 *
 * Upload goes straight to Cloudinary using a server-issued signature, so the
 * file never passes through our server and no credential reaches the browser.
 * Stock search and ingest both go through server routes.
 */

export interface PickedImage {
  url: string;
  altText: string;
  attributionText: string | null;
  publicId: string | null;
  source: "upload" | "unsplash" | "pexels" | "pixabay";
}

interface StockPhoto {
  id: string;
  provider: "unsplash" | "pexels" | "pixabay";
  thumbUrl: string;
  previewUrl: string;
  fullUrl: string;
  altText: string;
  photographerName: string;
  photographerUrl: string | null;
  sourcePageUrl: string;
  attributionText: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const STOCK_PAGE_SIZE = 20;

function providerLabel(provider: StockPhoto["provider"]): string {
  switch (provider) {
    case "unsplash":
      return "Unsplash";
    case "pexels":
      return "Pexels";
    case "pixabay":
      return "Pixabay";
  }
}

export function ImagePicker({
  onPick,
  articleId,
  triggerLabel = "Pilih gambar",
  suggestedQuery,
}: {
  onPick: (image: PickedImage) => void;
  articleId?: string;
  triggerLabel?: string;
  suggestedQuery?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="md">
          <ImagePlus aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent size="xl" aria-describedby="image-picker-desc">
        <DialogHeader>
          <DialogTitle>Pustaka gambar</DialogTitle>
          <DialogDescription id="image-picker-desc">
            Upload dari perangkat, atau cari foto stok. Kredit fotografer
            otomatis tersimpan dan ditampilkan bersama gambar.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">
                <Upload aria-hidden="true" className="size-3.5" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="stock">Foto stok</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <UploadPanel
                onDone={(image) => {
                  onPick(image);
                  setOpen(false);
                }}
              />
            </TabsContent>

            <TabsContent value="stock">
              <StockPanel
                {...(articleId ? { articleId } : {})}
                {...(suggestedQuery ? { suggestedQuery } : {})}
                onDone={(image) => {
                  onPick(image);
                  setOpen(false);
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function UploadPanel({ onDone }: { onDone: (image: PickedImage) => void }) {
  const [uploading, setUploading] = React.useState(false);
  const [altText, setAltText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = async () => {
    if (!file) return;
    if (altText.trim().length < 3) {
      toast.error("Alt text wajib diisi", {
        description: "Minimal 3 karakter, deskripsikan isi gambar.",
      });
      return;
    }

    setUploading(true);
    try {
      const signResponse = await fetch("/api/images/sign", { method: "POST" });
      const signature = (await signResponse.json()) as {
        signature?: string;
        timestamp?: number;
        apiKey?: string;
        folder?: string;
        uploadUrl?: string;
        error?: string;
      };

      if (!signResponse.ok || !signature.signature || !signature.uploadUrl) {
        throw new Error(signature.error ?? "Gagal mendapatkan izin upload.");
      }

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signature.apiKey ?? "");
      form.append("timestamp", String(signature.timestamp ?? ""));
      form.append("signature", signature.signature);
      form.append("folder", signature.folder ?? "");

      const uploadResponse = await fetch(signature.uploadUrl, {
        method: "POST",
        body: form,
      });

      const result = (await uploadResponse.json()) as {
        secure_url?: string;
        public_id?: string;
        error?: { message?: string };
      };

      if (!uploadResponse.ok || !result.secure_url) {
        throw new Error(result.error?.message ?? "Upload ke Cloudinary gagal.");
      }

      onDone({
        url: result.secure_url,
        altText: altText.trim(),
        attributionText: null,
        publicId: result.public_id ?? null,
        source: "upload",
      });
      toast.success("Gambar terunggah");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (selected && selected.size > MAX_UPLOAD_BYTES) {
            toast.error("File terlalu besar", {
              description: `Maksimal ${formatBytes(MAX_UPLOAD_BYTES)}.`,
            });
            return;
          }
          setFile(selected);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="md" onClick={() => inputRef.current?.click()}>
          <Upload aria-hidden="true" />
          Pilih file
        </Button>
        {file ? (
          <span className="text-[0.8125rem] text-muted">
            {file.name} · {formatBytes(file.size)}
          </span>
        ) : (
          <span className="text-[0.8125rem] text-muted">
            JPG, PNG, WEBP, atau AVIF. Maksimal {formatBytes(MAX_UPLOAD_BYTES)}.
          </span>
        )}
      </div>

      <Field
        label="Alt text"
        htmlFor="upload-alt"
        required
        hint="Deskripsikan isi gambar untuk pembaca yang memakai screen reader."
      >
        <Input
          id="upload-alt"
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          maxLength={240}
        />
      </Field>

      <Button
        variant="primary"
        size="md"
        disabled={!file || uploading}
        onClick={() => void upload()}
      >
        {uploading ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" />
            Mengunggah
          </>
        ) : (
          "Unggah ke Cloudinary"
        )}
      </Button>
    </div>
  );
}

function StockPanel({
  articleId,
  suggestedQuery,
  onDone,
}: {
  articleId?: string;
  suggestedQuery?: string;
  onDone: (image: PickedImage) => void;
}) {
  const [query, setQuery] = React.useState(suggestedQuery ?? "");
  const [page, setPage] = React.useState(1);
  const [lastQuery, setLastQuery] = React.useState("");
  const [photos, setPhotos] = React.useState<StockPhoto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [ingestingId, setIngestingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [quota, setQuota] = React.useState<{
    remaining: number | null;
    total: number | null;
    note: string | null;
  }>({ remaining: null, total: null, note: null });

  const searchPage = async (nextPage: number, nextQuery = query) => {
    const term = nextQuery.trim();
    if (term.length < 2) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        provider: "all",
        query: term,
        page: String(nextPage),
        perPage: String(STOCK_PAGE_SIZE),
        orientation: "landscape",
      });
      const response = await fetch(`/api/images/search?${params.toString()}`);
      const payload = (await response.json()) as {
        photos?: StockPhoto[];
        rateLimitRemaining?: number | null;
        rateLimitTotal?: number | null;
        providerNote?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Pencarian gagal.");
      }

      setPhotos(payload.photos ?? []);
      setPage(nextPage);
      setLastQuery(term);
      setQuota({
        remaining: payload.rateLimitRemaining ?? null,
        total: payload.rateLimitTotal ?? null,
        note: payload.providerNote ?? null,
      });
    } catch (caught) {
      setPhotos([]);
      setError(caught instanceof Error ? caught.message : "Pencarian gagal.");
    } finally {
      setLoading(false);
    }
  };

  const search = async (event?: React.FormEvent) => {
    event?.preventDefault();
    await searchPage(1);
  };

  const pick = async (photo: StockPhoto) => {
    setIngestingId(photo.id);
    try {
      const response = await fetch("/api/images/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: photo.provider,
          remoteUrl: photo.fullUrl,
          altText: photo.altText,
          photographerName: photo.photographerName,
          photographerUrl: photo.photographerUrl ?? "",
          originalSourceUrl: photo.sourcePageUrl,
          articleId,
          isCover: false,
        }),
      });

      const payload = (await response.json()) as {
        url?: string;
        publicId?: string;
        altText?: string;
        attributionText?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Gambar gagal disimpan.");
      }

      onDone({
        url: payload.url,
        altText: payload.altText ?? photo.altText,
        attributionText: payload.attributionText ?? photo.attributionText,
        publicId: payload.publicId ?? null,
        source: photo.provider,
      });
      toast.success("Gambar tersimpan dengan kredit fotografer");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Gambar gagal disimpan.",
      );
    } finally {
      setIngestingId(null);
    }
  };

  return (
    <div className="grid gap-3">
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <label htmlFor="stock-all" className="sr-only">
          Kata kunci gambar
        </label>
        <Input
          id="stock-all"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="young people coffee shop indonesia"
          className="min-w-0 flex-1"
          maxLength={120}
        />
        <Button type="submit" variant="outline" size="md" disabled={loading}>
          {loading ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Search aria-hidden="true" />
          )}
          Cari
        </Button>
      </form>

      <p className="text-[0.8125rem] text-muted">
        Mencari foto landscape dari Unsplash, Pexels, dan Pixabay jika API key aktif.
        Kata kunci Bahasa Inggris biasanya memberi hasil lebih relevan.
        {quota.remaining !== null
          ? ` Kuota tersisa: ${quota.remaining}${quota.total ? `/${quota.total}` : ""}.`
          : ""}
      </p>

      {quota.note ? (
        <p className="border-l-2 border-orange pl-2.5 text-[0.8125rem] text-muted">
          {quota.note}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-danger bg-danger/10 px-2.5 py-2 text-[0.8125rem] font-semibold text-danger"
        >
          {error}
        </p>
      ) : null}

      {photos.length > 0 ? (
        <>
          <ul className="grid max-h-[26rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => void pick(photo)}
                  disabled={ingestingId !== null}
                  className="group block w-full border-2 border-line bg-wall-deep text-left transition-colors hover:border-lime disabled:opacity-60"
                >
                  <span className="relative block aspect-video w-full overflow-hidden border-b-2 border-line">
                    {photo.previewUrl ? (
                      <CloudinaryImage
                        src={photo.previewUrl}
                        alt={photo.altText}
                        sizes="(min-width: 640px) 240px, 45vw"
                        widths={[320, 480]}
                      />
                    ) : null}
                    {ingestingId === photo.id ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-wall/80">
                        <Loader2
                          aria-hidden="true"
                          className="size-5 animate-spin text-lime"
                        />
                      </span>
                    ) : null}
                  </span>
                  <span className="block p-2">
                    <span className="block truncate text-[0.75rem] text-foreground">
                      {photo.photographerName}
                    </span>
                    <span className="mt-1 flex min-h-6 items-center justify-between gap-2">
                      <TapePatch tone="outline" size="sm">
                        {providerLabel(photo.provider)}
                      </TapePatch>
                      <span className="min-w-0 truncate text-[0.6875rem] text-muted">
                        {photo.attributionText}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => void searchPage(Math.max(1, page - 1), lastQuery)}
            >
              <ChevronLeft aria-hidden="true" />
              Sebelumnya
            </Button>
            <span className="text-[0.75rem] font-semibold text-muted">
              Halaman {page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || photos.length < STOCK_PAGE_SIZE}
              onClick={() => void searchPage(page + 1, lastQuery)}
            >
              Berikutnya
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </>
      ) : null}

      {!loading && photos.length === 0 && !error ? (
        <p className="text-[0.8125rem] text-muted">
          Belum ada hasil. Masukkan kata kunci lalu tekan Cari.
        </p>
      ) : null}
    </div>
  );
}
