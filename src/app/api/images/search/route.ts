import { NextResponse, type NextRequest } from "next/server";

import { getApiAuth } from "@/lib/auth";
import {
  RATE_LIMITS,
  rateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import {
  configuredStockProviders,
  searchStockPhotos,
  StockSearchError,
} from "@/lib/images/stock";
import { imageSearchSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Stock photo search proxy.
 *
 * Editor-only. Provider keys stay in server env; the browser only ever sees
 * results and attribution. Rate limited per editor so one open picker cannot
 * burn the Unsplash hourly quota.
 */
export async function GET(request: NextRequest) {
  const auth = await getApiAuth("editor");
  if (!auth) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const limit = rateLimit(
    `image-search:${auth.profile.id}`,
    RATE_LIMITS.imageSearch.limit,
    RATE_LIMITS.imageSearch.windowMs,
  );
  if (!limit.ok) {
    return tooManyRequests(limit, "Terlalu banyak pencarian. Tunggu sebentar.");
  }

  const params = request.nextUrl.searchParams;
  const parsed = imageSearchSchema.safeParse({
    provider: params.get("provider"),
    query: params.get("query"),
    page: params.get("page") ?? undefined,
    perPage: params.get("perPage") ?? undefined,
    orientation: params.get("orientation") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter pencarian tidak valid." },
      { status: 400 },
    );
  }

  try {
    const result = await searchStockPhotos(parsed.data);
    return NextResponse.json({
      ...result,
      availableProviders: configuredStockProviders(),
    });
  } catch (error) {
    if (error instanceof StockSearchError) {
      return NextResponse.json(
        { error: error.message, availableProviders: configuredStockProviders() },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Pencarian gambar gagal." },
      { status: 500 },
    );
  }
}
