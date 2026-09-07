"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCheck, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Textarea } from "@/components/ui/field";
import { SetupNotice } from "@/components/shared/empty-state";
import {
  contributionFormSchema,
  type ContributionFormValues,
} from "@/lib/validation";
import { formatBytes } from "@/lib/utils";
import { PILLARS, PILLAR_META } from "@/types/domain";
import { PILLAR_INK } from "@/lib/pillar-ink";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

interface UploadedMedia {
  url: string;
  name: string;
  size: number;
}

/**
 * Community contribution form. Validates with the same Zod schema the API route
 * uses, so a bypassed client check still fails server-side.
 */
export function ContributionForm({ canSubmit }: { canSubmit: boolean }) {
  const [submitted, setSubmitted] = React.useState(false);
  const [media, setMedia] = React.useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: {
      contributorName: "",
      contributorContact: "",
      title: "",
      pillar: "vibes",
      content: "",
      location: "",
      mediaUrls: [],
      consentEdit: false,
    },
  });

  // useWatch subscribes to a single field, which the React Compiler can track.
  const pillar = useWatch({ control, name: "pillar" });
  const content = useWatch({ control, name: "content" }) ?? "";

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Format tidak didukung", {
        description: "Pakai JPG, PNG, WEBP, atau AVIF.",
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Ukuran file terlalu besar", {
        description: `Maksimal ${formatBytes(MAX_FILE_BYTES)}, file kamu ${formatBytes(file.size)}.`,
      });
      return;
    }
    if (media.length >= 4) {
      toast.error("Maksimal 4 gambar");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/contributions/upload", {
        method: "POST",
        body,
      });

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Upload gagal.");
      }

      const next = [...media, { url: payload.url, name: file.name, size: file.size }];
      setMedia(next);
      setValue(
        "mediaUrls",
        next.map((item) => item.url),
        { shouldValidate: true },
      );
      toast.success("Gambar terunggah");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (url: string) => {
    const next = media.filter((item) => item.url !== url);
    setMedia(next);
    setValue(
      "mediaUrls",
      next.map((item) => item.url),
      { shouldValidate: true },
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; fields?: Record<string, string> }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Kiriman gagal dikirim. Coba lagi beberapa saat lagi.",
        );
      }

      reset();
      setMedia([]);
      setSubmitted(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kiriman gagal dikirim.",
      );
    }
  });

  if (submitted) {
    return (
      <BannerPanel ink="wall" lift="md" className="border-lime p-5 sm:p-6">
        <TapePatch tone="lime" tilt="left">
          <CheckCheck aria-hidden="true" className="size-3.5" />
          Masuk antrean
        </TapePatch>
        <h2 className="tng-display mt-4 text-2xl sm:text-3xl">
          Kiriman kamu sudah masuk
        </h2>
        <div className="tng-measure mt-3 grid gap-3 text-sm leading-relaxed text-muted">
          <p>
            Kiriman ini <strong className="text-foreground">belum tayang</strong>.
            Yang terjadi sekarang: kiriman masuk ke antrean moderasi editor TNG
            Daily.
          </p>
          <p>
            Kalau layak tayang, kami akan menulis atau menyunting dengan atribusi
            sesuai izin yang kamu berikan. Kalau kamu mengisi kontak, kami
            hubungi lebih dulu untuk detail yang perlu dipastikan.
          </p>
        </div>
        <Button
          variant="outline"
          size="md"
          className="mt-5"
          onClick={() => setSubmitted(false)}
        >
          Kirim cerita lain
        </Button>
      </BannerPanel>
    );
  }

  return (
    <div className="grid gap-3">
      {!canSubmit ? (
        <SetupNotice
          title="Form belum bisa mengirim"
          description="Kiriman komunitas ditulis ke database lewat server route dengan service role. Tanpa kredensial ini, form tetap tervalidasi tapi tidak bisa menyimpan."
          envKeys={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
          docHint="Setelah env terisi dan migration diterapkan, form langsung aktif tanpa perubahan kode."
        />
      ) : null}

      <BannerPanel ink="wall" lift="md" className="p-4 sm:p-5">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama atau nama pena"
              htmlFor="contributorName"
              required
              error={errors.contributorName?.message}
              hint="Boleh nama pena. Tulis Anonim kalau tidak mau disebut."
            >
              <Input
                id="contributorName"
                autoComplete="name"
                aria-invalid={Boolean(errors.contributorName)}
                {...register("contributorName")}
              />
            </Field>

            <Field
              label="Kontak (opsional)"
              htmlFor="contributorContact"
              error={errors.contributorContact?.message}
              hint="Email atau WA. Hanya dipakai redaksi untuk verifikasi."
            >
              <Input
                id="contributorContact"
                autoComplete="email"
                aria-invalid={Boolean(errors.contributorContact)}
                {...register("contributorContact")}
              />
            </Field>
          </div>

          <Field
            label="Judul kiriman"
            htmlFor="title"
            required
            error={errors.title?.message}
            hint="Satu baris yang menjelaskan isinya. Tidak perlu catchy."
          >
            <Input
              id="title"
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
          </Field>

          <fieldset className="grid gap-2">
            <legend className="tng-label mb-1 text-muted">
              Pilar
              <span aria-hidden="true" className="ml-1 text-orange">
                *
              </span>
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PILLARS.map((option) => {
                const ink = PILLAR_INK[option];
                const isActive = pillar === option;
                return (
                  <label
                    key={option}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-[3px] border-2 p-2.5 transition-colors",
                      isActive
                        ? "border-keyline bg-surface-strong shadow-[var(--shadow-hard-sm)]"
                        : "border-line bg-wall-deep hover:border-muted/60",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        value={option}
                        className="size-4 accent-lime"
                        {...register("pillar")}
                      />
                      <span
                        className={cn(
                          "tng-label text-[0.625rem]",
                          isActive ? ink.accentText : "text-muted",
                        )}
                      >
                        {PILLAR_META[option].label}
                      </span>
                    </span>
                    <span className="text-[0.6875rem] leading-tight text-muted">
                      {PILLAR_META[option].tagline}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.pillar ? (
              <p role="alert" className="text-[0.8125rem] font-semibold text-danger">
                Pilih salah satu pilar.
              </p>
            ) : null}
          </fieldset>

          <Field
            label="Cerita atau rekomendasi"
            htmlFor="content"
            required
            error={errors.content?.message}
            hint={`Tulis apa adanya, detail lokal sangat membantu. ${content.length}/8000 karakter.`}
          >
            <Textarea
              id="content"
              rows={9}
              aria-invalid={Boolean(errors.content)}
              placeholder="Contoh: Ada warung di gang belakang pasar yang bukanya cuma jam 5 sampai 8 pagi. Harganya..."
              {...register("content")}
            />
          </Field>

          <Field
            label="Lokasi (opsional)"
            htmlFor="location"
            error={errors.location?.message}
            hint="Kecamatan atau nama area sudah cukup."
          >
            <Input
              id="location"
              placeholder="Cipondoh, Kota Tangerang"
              aria-invalid={Boolean(errors.location)}
              {...register("location")}
            />
          </Field>

          <div className="grid gap-2">
            <Label>Foto (opsional, maksimal 4)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="sr-only"
              onChange={(event) => void onUpload(event.target.files)}
            />
            <Button
              variant="outline"
              size="md"
              disabled={uploading || media.length >= 4 || !canSubmit}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <ImagePlus aria-hidden="true" />
              )}
              {uploading ? "Mengunggah" : "Pilih gambar"}
            </Button>
            <p className="text-[0.8125rem] text-muted">
              JPG, PNG, WEBP, atau AVIF. Maksimal {formatBytes(MAX_FILE_BYTES)} per
              file. Hanya kirim foto yang kamu ambil sendiri atau kamu punya izin
              untuk pakai.
            </p>

            {media.length > 0 ? (
              <ul className="grid gap-1.5">
                {media.map((item) => (
                  <li
                    key={item.url}
                    className="flex items-center gap-2 border-2 border-line bg-wall-deep px-2.5 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-[0.75rem] text-muted">
                      {formatBytes(item.size)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus ${item.name}`}
                      onClick={() => removeMedia(item.url)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <fieldset className="grid gap-2.5 border-t-2 border-line pt-4">
            <legend className="tng-label text-muted">Izin</legend>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-lime"
                aria-invalid={Boolean(errors.consentPublish)}
                {...register("consentPublish")}
              />
              <span className="text-[0.8125rem] leading-snug text-foreground">
                Saya mengizinkan TNG Daily mempertimbangkan kiriman ini untuk
                dipublikasikan, dengan atribusi sesuai nama yang saya tulis di
                atas.
                <span aria-hidden="true" className="ml-1 text-orange">
                  *
                </span>
              </span>
            </label>
            {errors.consentPublish ? (
              <p
                role="alert"
                className="border-l-2 border-danger pl-2 text-[0.8125rem] font-semibold text-danger"
              >
                {errors.consentPublish.message}
              </p>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-lime"
                {...register("consentEdit")}
              />
              <span className="text-[0.8125rem] leading-snug text-muted">
                Saya mengizinkan editor menyunting tulisan ini untuk kejelasan,
                tanpa mengubah maksud aslinya.
              </span>
            </label>
          </fieldset>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" />
                Mengirim
              </>
            ) : (
              "Kirim ke redaksi"
            )}
          </Button>

          <p className="text-center text-[0.75rem] text-muted">
            Kiriman masuk moderasi. Tidak ada yang tayang otomatis.
          </p>
        </form>
      </BannerPanel>
    </div>
  );
}
