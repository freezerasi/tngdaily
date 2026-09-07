import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

import { getAdminSupabase } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/env";
import {
  RATE_LIMITS,
  rateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { clientAddressFrom, hashClientIdentifier } from "@/lib/security/session";

export const runtime = "nodejs";

/**
 * Contribution image upload.
 *
 * Anonymous uploads never touch Cloudinary credentials. They land in the public
 * `contributions` Storage bucket through the service role, after a server-side
 * check of size and magic bytes. The declared MIME type is not trusted.
 */
const MAX_BYTES = 5 * 1024 * 1024;

const SIGNATURES: Array<{ ext: string; type: string; test: (b: Uint8Array) => boolean }> =
  [
    {
      ext: "jpg",
      type: "image/jpeg",
      test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    },
    {
      ext: "png",
      type: "image/png",
      test: (b) =>
        b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
    },
    {
      ext: "webp",
      type: "image/webp",
      test: (b) =>
        b[0] === 0x52 &&
        b[1] === 0x49 &&
        b[2] === 0x46 &&
        b[3] === 0x46 &&
        b[8] === 0x57 &&
        b[9] === 0x45 &&
        b[10] === 0x42 &&
        b[11] === 0x50,
    },
    {
      ext: "avif",
      type: "image/avif",
      test: (b) =>
        b[4] === 0x66 &&
        b[5] === 0x74 &&
        b[6] === 0x79 &&
        b[7] === 0x70 &&
        b[8] === 0x61 &&
        b[9] === 0x76 &&
        b[10] === 0x69 &&
        b[11] === 0x66,
    },
  ];

export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Upload belum aktif karena server belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const ipHash = hashClientIdentifier(clientAddressFrom(request.headers));
  const limit = rateLimit(
    `contrib-upload:${ipHash}`,
    RATE_LIMITS.contributionUploads.limit,
    RATE_LIMITS.contributionUploads.windowMs,
  );
  if (!limit.ok) {
    return tooManyRequests(limit, "Terlalu banyak upload. Coba lagi nanti.");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File kosong." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file melebihi 5 MB." },
      { status: 413 },
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const signature = SIGNATURES.find((candidate) => candidate.test(buffer));
  if (!signature) {
    return NextResponse.json(
      { error: "File bukan gambar JPG, PNG, WEBP, atau AVIF." },
      { status: 415 },
    );
  }

  const admin = getAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Upload gagal." }, { status: 503 });
  }

  const objectPath = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${signature.ext}`;

  const { error } = await admin.storage
    .from("contributions")
    .upload(objectPath, buffer, {
      contentType: signature.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      {
        error:
          "Upload gagal. Pastikan bucket 'contributions' sudah dibuat lewat migration 0006.",
      },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("contributions").getPublicUrl(objectPath);

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
