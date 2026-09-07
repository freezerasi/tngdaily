import { NextResponse, type NextRequest } from "next/server";

import { getApiAuth } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { ingestRemoteImage } from "@/lib/cloudinary";
import { isCloudinaryConfigured } from "@/lib/env";
import { imageIngestSchema } from "@/lib/validation";
import { assertPublicUrl } from "@/lib/security/ssrf";

export const runtime = "nodejs";

/**
 * Stock photo ingest.
 *
 * Pulls the chosen image into Cloudinary so delivery stays under our control,
 * and records the attribution the provider licence requires. The URL is
 * SSRF-checked even though it comes from our own search proxy, because the
 * request body is client-controlled.
 */
const ALLOWED_HOSTS: Record<string, readonly string[]> = {
  unsplash: ["images.unsplash.com", "plus.unsplash.com"],
  pexels: ["images.pexels.com"],
  pixabay: ["pixabay.com", "cdn.pixabay.com"],
};

export async function POST(request: NextRequest) {
  const auth = await getApiAuth("editor");
  if (!auth) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Cloudinary belum dikonfigurasi, jadi gambar stok belum bisa disimpan.",
      },
      { status: 503 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = imageIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data gambar tidak valid." },
      { status: 400 },
    );
  }

  const values = parsed.data;

  const check = await assertPublicUrl(values.remoteUrl);
  if (!check.ok || !check.url) {
    return NextResponse.json(
      { error: check.message ?? "URL gambar ditolak." },
      { status: 400 },
    );
  }

  const allowed = ALLOWED_HOSTS[values.provider] ?? [];
  if (!allowed.includes(check.url.hostname)) {
    return NextResponse.json(
      { error: "Host gambar tidak sesuai provider yang dipilih." },
      { status: 400 },
    );
  }

  let ingested;
  try {
    ingested = await ingestRemoteImage(check.url.toString(), {
      tags: ["tngdaily", values.provider],
    });
  } catch {
    return NextResponse.json(
      { error: "Gambar gagal dipindahkan ke Cloudinary." },
      { status: 502 },
    );
  }

  const attributionText =
    values.photographerName
      ? `Foto oleh ${values.photographerName} di ${providerLabel(values.provider)}`
      : `Foto dari ${providerLabel(values.provider)}`;

  const supabase = await getServerSupabase();
  let imageId: string | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("article_images")
      .insert({
        article_id: values.articleId ?? null,
        cloudinary_public_id: ingested.publicId,
        url: ingested.url,
        alt_text: values.altText,
        width: ingested.width,
        height: ingested.height,
        source: values.provider,
        original_source_url: values.originalSourceUrl || null,
        photographer_name: values.photographerName || null,
        photographer_url: values.photographerUrl || null,
        attribution_text: attributionText,
        is_cover: values.isCover,
        created_by: auth.profile.id,
      })
      .select("id")
      .maybeSingle();

    imageId = (data as { id: string } | null)?.id ?? null;
  }

  return NextResponse.json({
    id: imageId,
    url: ingested.url,
    publicId: ingested.publicId,
    altText: values.altText,
    attributionText,
  });
}

function providerLabel(provider: "unsplash" | "pexels" | "pixabay"): string {
  switch (provider) {
    case "unsplash":
      return "Unsplash";
    case "pexels":
      return "Pexels";
    case "pixabay":
      return "Pixabay";
  }
}
