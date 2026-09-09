import { NextResponse, type NextRequest } from "next/server";

import { getAdminSupabase, getPublicSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  RATE_LIMITS,
  rateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import {
  clientAddressFrom,
  hashClientIdentifier,
} from "@/lib/security/session";
import { uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * View beacon.
 *
 * The article page is static ISR, so it cannot count its own views during
 * render — a static hit never reaches the server. The client fires this
 * endpoint once per page view instead (see `ViewRecorder`). Counting happens
 * off the render path, so a slow database can never delay the article.
 *
 * Safety: the RPC only increments published rows, the article id is validated
 * as a UUID, and a per-IP budget blunts floods. Over-counting a refresh is
 * accepted; a view counter is a signal, not an audit trail.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = uuidSchema.safeParse(
    typeof body === "object" && body !== null
      ? (body as { articleId?: unknown }).articleId
      : null,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "articleId tidak valid." }, { status: 400 });
  }

  const ipHash = hashClientIdentifier(clientAddressFrom(request.headers));
  const limit = rateLimit(
    `article-views:${ipHash}`,
    RATE_LIMITS.articleViews.limit,
    RATE_LIMITS.articleViews.windowMs,
  );
  if (!limit.ok) {
    return tooManyRequests(limit, "Terlalu banyak permintaan. Tunggu sebentar.");
  }

  const supabase = getPublicSupabase() ?? getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  // tng_increment_article_view is granted to anon and only touches published
  // rows, so no separate visibility check is needed here.
  const { error } = await supabase.rpc("tng_increment_article_view", {
    p_article_id: parsed.data,
  });
  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
