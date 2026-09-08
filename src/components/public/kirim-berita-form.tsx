"use client";

import * as React from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  kirimBeritaFormSchema,
  type KirimBeritaFormValues,
} from "@/lib/validation";

export function KirimBeritaForm() {
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KirimBeritaFormValues>({
    resolver: zodResolver(kirimBeritaFormSchema),
    defaultValues: {
      fullName: "",
      displayName: "",
      email: "",
      whatsapp: "",
      district: "",
      title: "",
      content: "",
      mediaUrl: "",
      consentOriginality: false as unknown as true,
      consentPrivacy: false as unknown as true,
    },
  });

  const content = useWatch({ control, name: "content" }) ?? "";

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
          payload?.error ?? "Kiriman gagal dikirim. Coba lagi beberapa saat lagi.",
        );
      }

      reset();
      setSubmitted(true);
      toast.success("Kiriman berhasil dikirim ke meja redaksi.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kiriman gagal dikirim.",
      );
    }
  });

  if (submitted) {
    return (
      <BannerPanel ink="wall" lift="md" className="border-2 border-lime p-5 sm:p-7">
        <TapePatch tone="lime" tilt="left">
          <CheckCheck aria-hidden="true" className="size-3.5" />
          Terkirim
        </TapePatch>
        <h2 className="tng-display mt-4 text-2xl sm:text-3xl text-foreground">
          Naskah sudah masuk meja redaksi
        </h2>
        <div className="mt-3 grid gap-3 text-sm leading-relaxed text-muted">
          <p>
            Konfirmasi tanda terima diproses dalam 1x24 jam kerja. Naskah kamu akan ditelaah
            oleh <strong className="text-foreground">Redaktur Komunitas</strong>,
            dan jika layak naik akan diproses bersama{" "}
            <strong className="text-foreground">Redaktur Pelaksana</strong>.
          </p>
          <p>
            Ingat, kiriman masuk bukan jaminan terbit. Jika kami butuh verifikasi lebih lanjut,
            kami akan menghubungi nomor WhatsApp atau email yang kamu cantumkan.
          </p>
        </div>
        <Button
          variant="outline"
          size="md"
          className="mt-6"
          onClick={() => setSubmitted(false)}
        >
          Kirim naskah lain
        </Button>
      </BannerPanel>
    );
  }

  return (
    <BannerPanel ink="wall" lift="md" className="border-2 border-line p-5 sm:p-7">
      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nama lengkap"
            htmlFor="fullName"
            required
            error={errors.fullName?.message}
            hint="Nama asli untuk verifikasi internal redaksi."
          >
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Contoh: Budi Santoso"
              aria-invalid={Boolean(errors.fullName)}
              {...register("fullName")}
            />
          </Field>

          <Field
            label="Nama yang ingin tampil di artikel"
            htmlFor="displayName"
            required
            error={errors.displayName?.message}
            hint="Bisa nama asli atau nama pena."
          >
            <Input
              id="displayName"
              placeholder="Contoh: Budi S. / Anonim"
              aria-invalid={Boolean(errors.displayName)}
              {...register("displayName")}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Email"
            htmlFor="email"
            required
            error={errors.email?.message}
            hint="Untuk konfirmasi penerimaan berkas."
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>

          <Field
            label="WhatsApp"
            htmlFor="whatsapp"
            required
            error={errors.whatsapp?.message}
            hint="Nomor aktif untuk konfirmasi cepat jika butuh rincian."
          >
            <Input
              id="whatsapp"
              type="tel"
              autoComplete="tel"
              placeholder="0821xxxxxxxx"
              aria-invalid={Boolean(errors.whatsapp)}
              {...register("whatsapp")}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Kecamatan / area"
            htmlFor="district"
            required
            error={errors.district?.message}
            hint="Lokasi spesifik kejadian (kelurahan, kecamatan, patokan)."
          >
            <Input
              id="district"
              placeholder="Contoh: Karawaci, Cipondoh, Serpong"
              aria-invalid={Boolean(errors.district)}
              {...register("district")}
            />
          </Field>

          <Field
            label="Tautan foto / video atau drive (opsional)"
            htmlFor="mediaUrl"
            error={errors.mediaUrl?.message}
            hint="Google Drive, Dropbox, atau link media yang bisa diakses publik."
          >
            <Input
              id="mediaUrl"
              placeholder="https://..."
              aria-invalid={Boolean(errors.mediaUrl)}
              {...register("mediaUrl")}
            />
          </Field>
        </div>

        <Field
          label="Judul usulan"
          htmlFor="title"
          required
          error={errors.title?.message}
          hint="Satu baris ringkas yang mencerminkan inti peristiwa."
        >
          <Input
            id="title"
            placeholder="Contoh: Warga Karawaci Keluhkan Truk Tanah Melintas di Luar Jam Operasional"
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
        </Field>

        <Field
          label="Isi naskah"
          htmlFor="content"
          required
          error={errors.content?.message}
          hint={`Disarankan 300–800 kata dengan format 5W+1H (Apa, Siapa, Di mana, Kapan, Mengapa, Bagaimana). ${content.length}/8000 karakter.`}
        >
          <Textarea
            id="content"
            rows={10}
            aria-invalid={Boolean(errors.content)}
            placeholder="Tuliskan peristiwa yang kamu alami atau saksikan secara runtut..."
            {...register("content")}
          />
        </Field>

        <fieldset className="grid gap-3 border-t-2 border-line pt-5">
          <legend className="font-display text-[0.8125rem] font-bold uppercase tracking-wider text-muted">
            Pernyataan & Persetujuan
          </legend>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-lime"
              aria-invalid={Boolean(errors.consentOriginality)}
              {...register("consentOriginality")}
            />
            <span className="text-[0.8125rem] leading-relaxed text-foreground">
              Saya menyatakan naskah ini asli, dapat diverifikasi, dan saya sudah membaca{" "}
              <Link
                href="/kode-etik"
                target="_blank"
                className="font-bold underline hover:text-lime"
              >
                Kode Etik
              </Link>{" "}
              serta{" "}
              <Link
                href="/syarat-ketentuan"
                target="_blank"
                className="font-bold underline hover:text-lime"
              >
                Syarat dan Ketentuan
              </Link>
              .
              <span aria-hidden="true" className="ml-1 text-orange">
                *
              </span>
            </span>
          </label>
          {errors.consentOriginality ? (
            <p
              role="alert"
              className="border-l-2 border-danger pl-2.5 text-[0.8125rem] font-semibold text-danger"
            >
              {errors.consentOriginality.message}
            </p>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-lime"
              aria-invalid={Boolean(errors.consentPrivacy)}
              {...register("consentPrivacy")}
            />
            <span className="text-[0.8125rem] leading-relaxed text-foreground">
              Saya setuju data saya diproses redaksi sesuai{" "}
              <Link
                href="/kebijakan-privasi"
                target="_blank"
                className="font-bold underline hover:text-lime"
              >
                Kebijakan Privasi
              </Link>
              .
              <span aria-hidden="true" className="ml-1 text-orange">
                *
              </span>
            </span>
          </label>
          {errors.consentPrivacy ? (
            <p
              role="alert"
              className="border-l-2 border-danger pl-2.5 text-[0.8125rem] font-semibold text-danger"
            >
              {errors.consentPrivacy.message}
            </p>
          ) : null}
        </fieldset>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          disabled={isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Mengirim naskah...
            </>
          ) : (
            "Kirim Naskah ke Redaksi"
          )}
        </Button>

        <p className="text-center text-[0.75rem] text-muted">
          Kirim juga ke WhatsApp{" "}
          <a
            href="https://wa.me/6282114812842"
            className="font-bold underline hover:text-lime"
          >
            0821-1481-2842
          </a>{" "}
          kalau formulir sedang bermasalah. Tetap pakai format di atas.
        </p>
      </form>
    </BannerPanel>
  );
}
