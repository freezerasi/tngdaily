import "server-only";

import { stockPhotoKeys } from "@/lib/env";
import type { ImageSearchQuery } from "@/lib/validation";

/**
 * Stock photo proxy.
 *
 * Provider keys are read here and never sent to the browser. Every result
 * carries the attribution string the provider's licence requires, so the CMS
 * cannot store an image without its credit.
 */

export interface StockPhoto {
  id: string;
  provider: StockProvider;
  thumbUrl: string;
  previewUrl: string;
  fullUrl: string;
  width: number | null;
  height: number | null;
  altText: string;
  photographerName: string;
  photographerUrl: string | null;
  sourcePageUrl: string;
  attributionText: string;
}

export type StockProvider = "unsplash" | "pexels" | "pixabay";

export interface StockSearchResult {
  photos: StockPhoto[];
  total: number;
  /** Remaining requests reported by the provider, when it exposes one. */
  rateLimitRemaining: number | null;
  rateLimitTotal: number | null;
  providerNote: string | null;
}

export class StockSearchError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "StockSearchError";
    this.status = status;
  }
}

const TIMEOUT_MS = 10_000;
const AGGREGATE_PAGE_SIZE: Record<StockProvider, number> = {
  unsplash: 7,
  pexels: 7,
  pixabay: 6,
};
const PROVIDER_LABELS: Record<StockProvider, string> = {
  unsplash: "Unsplash",
  pexels: "Pexels",
  pixabay: "Pixabay",
};

type ProviderSearchQuery = Omit<ImageSearchQuery, "provider"> & {
  provider: StockProvider;
};

function hasImageUrls(photo: StockPhoto): boolean {
  return Boolean(photo.thumbUrl && photo.previewUrl && photo.fullUrl);
}

function isLandscape(photo: StockPhoto): boolean {
  if (!photo.width || !photo.height) return true;
  return photo.width > photo.height;
}

function cleanPhotos(photos: StockPhoto[]): StockPhoto[] {
  return photos.filter((photo) => hasImageUrls(photo) && isLandscape(photo));
}

async function fetchJson(
  url: string,
  headers: Record<string, string>,
): Promise<{ payload: unknown; headers: Headers }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      void response.body?.cancel();
      throw new StockSearchError(
        502,
        "Provider menolak API key. Periksa environment variable di Vercel.",
      );
    }
    if (response.status === 429) {
      void response.body?.cancel();
      throw new StockSearchError(
        429,
        "Kuota provider habis. Coba provider lain atau tunggu reset kuota.",
      );
    }
    if (!response.ok) {
      void response.body?.cancel();
      throw new StockSearchError(
        502,
        `Provider mengembalikan status ${response.status}.`,
      );
    }

    return { payload: await response.json(), headers: response.headers };
  } catch (error) {
    if (error instanceof StockSearchError) throw error;
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    throw new StockSearchError(
      504,
      aborted
        ? "Provider tidak merespons dalam 10 detik."
        : "Gagal menghubungi provider gambar.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Unsplash
// ---------------------------------------------------------------------------

interface UnsplashPhoto {
  id: string;
  width?: number;
  height?: number;
  alt_description?: string | null;
  description?: string | null;
  urls?: { thumb?: string; small?: string; regular?: string; full?: string };
  links?: { html?: string };
  user?: { name?: string; links?: { html?: string } };
}

async function searchUnsplash(
  query: ProviderSearchQuery,
): Promise<StockSearchResult> {
  const key = stockPhotoKeys.unsplash;
  if (!key) {
    throw new StockSearchError(
      503,
      "UNSPLASH_ACCESS_KEY belum diset di environment server.",
    );
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query.query);
  url.searchParams.set("page", String(query.page));
  url.searchParams.set("per_page", String(query.perPage));
  url.searchParams.set("orientation", "landscape");

  const { payload, headers } = await fetchJson(url.toString(), {
    Authorization: `Client-ID ${key}`,
    "Accept-Version": "v1",
  });

  const body = payload as { results?: UnsplashPhoto[]; total?: number };
  const remaining = Number(headers.get("x-ratelimit-remaining") ?? "");
  const limit = Number(headers.get("x-ratelimit-limit") ?? "");

  return {
    photos: cleanPhotos((body.results ?? []).map((photo) => {
      const name = photo.user?.name ?? "Fotografer Unsplash";
      const profile = photo.user?.links?.html ?? null;
      return {
        id: `unsplash-${photo.id}`,
        provider: "unsplash" as const,
        thumbUrl: photo.urls?.thumb ?? "",
        previewUrl: photo.urls?.small ?? photo.urls?.thumb ?? "",
        fullUrl: photo.urls?.regular ?? photo.urls?.full ?? "",
        width: photo.width ?? null,
        height: photo.height ?? null,
        altText:
          photo.alt_description?.trim() ||
          photo.description?.trim() ||
          query.query,
        photographerName: name,
        photographerUrl: profile,
        sourcePageUrl: photo.links?.html ?? "https://unsplash.com",
        attributionText: `Foto oleh ${name} di Unsplash`,
      };
    })),
    total: body.total ?? 0,
    rateLimitRemaining: Number.isFinite(remaining) ? remaining : null,
    rateLimitTotal: Number.isFinite(limit) ? limit : null,
    providerNote:
      "Unsplash demo mode dibatasi 50 request per jam. Pexels lebih longgar untuk pemakaian harian.",
  };
}

// ---------------------------------------------------------------------------
// Pexels
// ---------------------------------------------------------------------------

interface PexelsPhoto {
  id: number;
  width?: number;
  height?: number;
  alt?: string;
  url?: string;
  photographer?: string;
  photographer_url?: string;
  src?: {
    tiny?: string;
    medium?: string;
    large?: string;
    large2x?: string;
    original?: string;
  };
}

async function searchPexels(
  query: ProviderSearchQuery,
): Promise<StockSearchResult> {
  const key = stockPhotoKeys.pexels;
  if (!key) {
    throw new StockSearchError(
      503,
      "PEXELS_API_KEY belum diset di environment server.",
    );
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query.query);
  url.searchParams.set("page", String(query.page));
  url.searchParams.set("per_page", String(query.perPage));
  url.searchParams.set("orientation", "landscape");

  const { payload, headers } = await fetchJson(url.toString(), {
    Authorization: key,
  });

  const body = payload as { photos?: PexelsPhoto[]; total_results?: number };
  const remaining = Number(headers.get("x-ratelimit-remaining") ?? "");
  const limit = Number(headers.get("x-ratelimit-limit") ?? "");

  return {
    photos: cleanPhotos((body.photos ?? []).map((photo) => {
      const name = photo.photographer ?? "Fotografer Pexels";
      return {
        id: `pexels-${photo.id}`,
        provider: "pexels" as const,
        thumbUrl: photo.src?.tiny ?? "",
        previewUrl: photo.src?.medium ?? photo.src?.tiny ?? "",
        fullUrl: photo.src?.large2x ?? photo.src?.large ?? photo.src?.original ?? "",
        width: photo.width ?? null,
        height: photo.height ?? null,
        altText: photo.alt?.trim() || query.query,
        photographerName: name,
        photographerUrl: photo.photographer_url ?? null,
        sourcePageUrl: photo.url ?? "https://www.pexels.com",
        attributionText: `Foto oleh ${name} di Pexels`,
      };
    })),
    total: body.total_results ?? 0,
    rateLimitRemaining: Number.isFinite(remaining) ? remaining : null,
    rateLimitTotal: Number.isFinite(limit) ? limit : null,
    providerNote: null,
  };
}

// ---------------------------------------------------------------------------
// Pixabay
// ---------------------------------------------------------------------------

interface PixabayHit {
  id: number;
  tags?: string;
  pageURL?: string;
  previewURL?: string;
  webformatURL?: string;
  largeImageURL?: string;
  imageWidth?: number;
  imageHeight?: number;
  user?: string;
  user_id?: number;
}

async function searchPixabay(
  query: ProviderSearchQuery,
): Promise<StockSearchResult> {
  const key = stockPhotoKeys.pixabay;
  if (!key) {
    throw new StockSearchError(
      503,
      "PIXABAY_API_KEY belum diset di environment server.",
    );
  }

  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", key);
  url.searchParams.set("q", query.query);
  url.searchParams.set("page", String(query.page));
  url.searchParams.set("per_page", String(query.perPage));
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("safesearch", "true");

  const { payload } = await fetchJson(url.toString(), {});
  const body = payload as { hits?: PixabayHit[]; totalHits?: number };

  return {
    photos: cleanPhotos((body.hits ?? []).map((hit) => {
      const name = hit.user ?? "Kontributor Pixabay";
      return {
        id: `pixabay-${hit.id}`,
        provider: "pixabay" as const,
        thumbUrl: hit.previewURL ?? "",
        previewUrl: hit.webformatURL ?? hit.previewURL ?? "",
        fullUrl: hit.largeImageURL ?? hit.webformatURL ?? "",
        width: hit.imageWidth ?? null,
        height: hit.imageHeight ?? null,
        altText: hit.tags?.split(",")[0]?.trim() || query.query,
        photographerName: name,
        photographerUrl: hit.user_id
          ? `https://pixabay.com/users/${hit.user_id}/`
          : null,
        sourcePageUrl: hit.pageURL ?? "https://pixabay.com",
        attributionText: `Gambar oleh ${name} di Pixabay`,
      };
    })),
    total: body.totalHits ?? 0,
    rateLimitRemaining: null,
    rateLimitTotal: null,
    providerNote: null,
  };
}

async function searchProvider(
  query: ProviderSearchQuery,
): Promise<StockSearchResult> {
  switch (query.provider) {
    case "unsplash":
      return searchUnsplash(query);
    case "pexels":
      return searchPexels(query);
    case "pixabay":
      return searchPixabay(query);
  }
}

function interleaveByProvider(results: Partial<Record<StockProvider, StockPhoto[]>>) {
  const orderedProviders: StockProvider[] = ["unsplash", "pexels", "pixabay"];
  const mixed: StockPhoto[] = [];
  const max = Math.max(
    0,
    ...orderedProviders.map((provider) => results[provider]?.length ?? 0),
  );

  for (let index = 0; index < max; index += 1) {
    for (const provider of orderedProviders) {
      const photo = results[provider]?.[index];
      if (photo) mixed.push(photo);
    }
  }

  return mixed;
}

async function searchAllProviders(
  query: ImageSearchQuery,
): Promise<StockSearchResult> {
  const providers = configuredStockProviders();
  const missingProviders = (["unsplash", "pexels", "pixabay"] as const).filter(
    (provider) => !providers.includes(provider),
  );
  if (providers.length === 0) {
    throw new StockSearchError(
      503,
      "Belum ada API key provider foto stok yang diset.",
    );
  }

  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const result = await searchProvider({
        ...query,
        provider,
        perPage: AGGREGATE_PAGE_SIZE[provider],
        orientation: "landscape",
      });
      return { provider, result };
    }),
  );

  const photosByProvider: Partial<Record<StockProvider, StockPhoto[]>> = {};
  const notes = missingProviders.length
    ? [
        `Provider belum aktif: ${missingProviders
          .map((provider) => PROVIDER_LABELS[provider])
          .join(", ")}.`,
      ]
    : [];
  let total = 0;
  let rateLimitRemaining: number | null = null;
  let rateLimitTotal: number | null = null;

  for (const item of settled) {
    if (item.status === "rejected") {
      const reason = item.reason;
      notes.push(
        reason instanceof Error
          ? reason.message
          : "Salah satu provider gagal memuat gambar.",
      );
      continue;
    }

    const { provider, result } = item.value;
    photosByProvider[provider] = result.photos.slice(0, AGGREGATE_PAGE_SIZE[provider]);
    total += result.total;
    rateLimitRemaining ??= result.rateLimitRemaining;
    rateLimitTotal ??= result.rateLimitTotal;
    if (result.providerNote) notes.push(result.providerNote);
  }

  const photos = interleaveByProvider(photosByProvider).slice(0, 20);

  if (photos.length === 0 && notes.length > 0) {
    throw new StockSearchError(502, notes[0] ?? "Pencarian gambar gagal.");
  }

  return {
    photos,
    total,
    rateLimitRemaining,
    rateLimitTotal,
    providerNote:
      notes.length > 0 ? Array.from(new Set(notes)).join(" ") : null,
  };
}

export function searchStockPhotos(
  query: ImageSearchQuery,
): Promise<StockSearchResult> {
  if (query.provider === "all") {
    return searchAllProviders(query);
  }

  return searchProvider({
    ...query,
    provider: query.provider,
    perPage: 20,
    orientation: "landscape",
  });
}

export function configuredStockProviders(): StockProvider[] {
  const providers: StockProvider[] = [];
  if (stockPhotoKeys.unsplash) providers.push("unsplash");
  if (stockPhotoKeys.pexels) providers.push("pexels");
  if (stockPhotoKeys.pixabay) providers.push("pixabay");
  return providers;
}
