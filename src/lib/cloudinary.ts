import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { cloudinaryConfig, isCloudinaryConfigured } from "@/lib/env";

/**
 * Cloudinary integration.
 *
 * The API secret never leaves the server. The browser receives only a signature
 * for a scoped upload, so it can upload directly without ever holding a
 * credential. Stock photos are ingested server-side.
 */

let configured = false;

function ensureConfigured(): boolean {
  if (!isCloudinaryConfigured()) return false;
  if (configured) return true;

  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName ?? undefined,
    api_key: cloudinaryConfig.apiKey ?? undefined,
    api_secret: cloudinaryConfig.apiSecret ?? undefined,
    secure: true,
  });
  configured = true;
  return true;
}

export interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
}

/**
 * Signature for a direct browser upload. Scoped to a folder and stamped with a
 * timestamp, so a leaked signature expires and cannot target other folders.
 */
export function createUploadSignature(): UploadSignature | null {
  if (!ensureConfigured()) return null;

  const timestamp = Math.round(Date.now() / 1000);
  const folder = cloudinaryConfig.folder;

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    cloudinaryConfig.apiSecret as string,
  );

  return {
    signature,
    timestamp,
    apiKey: cloudinaryConfig.apiKey as string,
    cloudName: cloudinaryConfig.cloudName as string,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
  };
}

export interface IngestResult {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
}

/**
 * Pulls a remote stock image into Cloudinary. Stock providers allow hosting the
 * delivered file; attribution is stored separately and rendered with the image.
 */
export async function ingestRemoteImage(
  remoteUrl: string,
  options: { tags?: string[] } = {},
): Promise<IngestResult> {
  if (!ensureConfigured()) {
    throw new Error("Cloudinary belum dikonfigurasi.");
  }

  const parsed = new URL(remoteUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("Hanya URL https yang bisa di-ingest.");
  }

  const result = await cloudinary.uploader.upload(remoteUrl, {
    folder: cloudinaryConfig.folder,
    resource_type: "image",
    tags: options.tags ?? ["tngdaily", "stock"],
    // Never trust remote filenames as public ids.
    use_filename: false,
    unique_filename: true,
    overwrite: false,
  });

  return {
    publicId: result.public_id,
    url:
      cloudinaryUrl(result.public_id, {
        width: 1600,
        crop: "limit",
        quality: "auto",
        format: "webp",
      }) ?? result.secure_url,
    width: result.width ?? null,
    height: result.height ?? null,
  };
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!ensureConfigured()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

/**
 * Builds a delivery URL with transformations. Used instead of the Next image
 * optimizer so Vercel's transformation quota is not consumed.
 */
export function cloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "limit";
    quality?: "auto" | number;
    format?: "auto" | "webp";
  } = {},
): string | null {
  const cloudName = cloudinaryConfig.cloudName;
  if (!cloudName) return null;

  const parts = [
    `f_${options.format ?? "auto"}`,
    `q_${options.quality ?? "auto"}`,
    options.width ? `w_${options.width}` : null,
    options.height ? `h_${options.height}` : null,
    options.crop ? `c_${options.crop}` : null,
  ].filter(Boolean);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${parts.join(",")}/${publicId}`;
}

/** True when a URL is already a Cloudinary delivery URL for this cloud. */
export function isOwnCloudinaryUrl(url: string): boolean {
  const cloudName = cloudinaryConfig.cloudName;
  if (!cloudName) return false;
  return url.startsWith(`https://res.cloudinary.com/${cloudName}/`);
}
