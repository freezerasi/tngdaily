import "server-only";

import { z } from "zod";

/**
 * Server-side environment access.
 *
 * This module imports `server-only`, so any accidental import from a Client
 * Component is a build error rather than a leaked secret. Never re-export the
 * raw `process.env` object and never log it.
 */

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .catch(undefined);

const rawSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url().optional().catch(undefined),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,

  NEXT_PUBLIC_SITE_URL: z
    .string()
    .trim()
    .url()
    .default("http://localhost:3000")
    .catch("http://localhost:3000"),

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_UPLOAD_FOLDER: z
    .string()
    .trim()
    .min(1)
    .default("tngdaily")
    .catch("tngdaily"),

  UNSPLASH_ACCESS_KEY: optionalString,
  PEXELS_API_KEY: optionalString,
  PIXABAY_API_KEY: optionalString,

  SECRET_STORE_DRIVER: z
    .enum(["development", "supabase-vault"])
    .optional()
    .catch(undefined),
  SECRET_STORE_DEV_KEY: optionalString,

  AI_LOCAL_DEV_FALLBACK_KEY: optionalString,
  AI_LOCAL_DEV_FALLBACK_BASE_URL: optionalString,
  AI_LOCAL_DEV_FALLBACK_MODEL: optionalString,

  DEMO_CONTENT: z
    .enum(["true", "false"])
    .optional()
    .catch(undefined),
});

const parsed = rawSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  CLOUDINARY_CLOUD_NAME:
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER,
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
  PEXELS_API_KEY: process.env.PEXELS_API_KEY,
  PIXABAY_API_KEY: process.env.PIXABAY_API_KEY,
  SECRET_STORE_DRIVER: process.env.SECRET_STORE_DRIVER,
  SECRET_STORE_DEV_KEY: process.env.SECRET_STORE_DEV_KEY,
  AI_LOCAL_DEV_FALLBACK_KEY: process.env.AI_LOCAL_DEV_FALLBACK_KEY,
  AI_LOCAL_DEV_FALLBACK_BASE_URL: process.env.AI_LOCAL_DEV_FALLBACK_BASE_URL,
  AI_LOCAL_DEV_FALLBACK_MODEL: process.env.AI_LOCAL_DEV_FALLBACK_MODEL,
  DEMO_CONTENT: process.env.DEMO_CONTENT,
});

export const env = parsed;

export const isProduction = parsed.NODE_ENV === "production";

export const supabaseConfig = {
  url: parsed.NEXT_PUBLIC_SUPABASE_URL ?? null,
  anonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
  serviceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY ?? null,
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.serviceRoleKey);
}

export const cloudinaryConfig = {
  cloudName: parsed.CLOUDINARY_CLOUD_NAME ?? null,
  apiKey: parsed.CLOUDINARY_API_KEY ?? null,
  apiSecret: parsed.CLOUDINARY_API_SECRET ?? null,
  folder: parsed.CLOUDINARY_UPLOAD_FOLDER,
} as const;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    cloudinaryConfig.cloudName &&
      cloudinaryConfig.apiKey &&
      cloudinaryConfig.apiSecret,
  );
}

export const stockPhotoKeys = {
  unsplash: parsed.UNSPLASH_ACCESS_KEY ?? null,
  pexels: parsed.PEXELS_API_KEY ?? null,
  pixabay: parsed.PIXABAY_API_KEY ?? null,
} as const;

/**
 * Demo content only fills in for a missing Supabase connection outside
 * production. In production a missing database surfaces as a setup state so
 * readers never see sample articles presented as real reporting.
 */
export function isDemoContentEnabled(): boolean {
  if (isProduction) return false;
  if (isSupabaseConfigured()) return false;
  return parsed.DEMO_CONTENT !== "false";
}

export const siteUrl = parsed.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
