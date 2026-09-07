import { NextResponse } from "next/server";

import { getApiAuth } from "@/lib/auth";
import { createUploadSignature } from "@/lib/cloudinary";

export const runtime = "nodejs";

/**
 * Signed Cloudinary upload.
 *
 * Returns a short-lived signature scoped to the configured folder. The API
 * secret is used to sign here and never sent to the browser.
 */
export async function POST() {
  const auth = await getApiAuth("editor");
  if (!auth) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const signature = createUploadSignature();
  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(signature);
}
