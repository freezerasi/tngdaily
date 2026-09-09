import { NextResponse, type NextRequest } from "next/server";

import { getPublicSupabase, getAdminSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  RATE_LIMITS,
  rateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import {
  clientAddressFrom,
  ensureSessionId,
  hashClientIdentifier,
  readSessionId,
} from "@/lib/security/session";
import { getSessionReactions } from "@/lib/data/articles";
import { reactionRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Session reaction state.
 *
 * Read-only and cookie-bound: it answers only "what did THIS reader already
 * press", so it is safe to call from the browser. The article page stays out
 * of the cookie jar on purpose — reading the session during render would opt
 * the route out of static ISR, and this endpoint lets the client dock hydrate
 * its pressed state after paint instead.
 */
export async function GET(request: NextRequest) {
  const articleId = request.nextUrl.searchParams.get("articleId")?.trim() ?? "";
  if (!articleId || articleId.length > 100) {
    return NextResponse.json(
      { error: "articleId tidak valid." },
      { status: 400 },
    );
  }

  const sessionId = await readSessionId();
  const active = await getSessionReactions(articleId, sessionId);
  return NextResponse.json({ active });
}

/**
 * Reaction toggle.
 *
 * The anonymous identifier lives in an httpOnly cookie issued here, so the
 * browser cannot forge a different reader. Writes go through the service role
 * because the unique index plus the article-published check is the real
 * authorisation, and anon delete would otherwise need to trust a client-sent id.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Reaksi belum aktif karena database belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const ipHash = hashClientIdentifier(clientAddressFrom(request.headers));
  const limit = rateLimit(
    `reactions:${ipHash}`,
    RATE_LIMITS.reactions.limit,
    RATE_LIMITS.reactions.windowMs,
  );
  if (!limit.ok) {
    return tooManyRequests(limit, "Terlalu banyak reaksi. Tunggu sebentar.");
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = reactionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { articleId, type, active } = parsed.data;

  const admin = getAdminSupabase();
  if (!admin) {
    return NextResponse.json(
      { error: "Reaksi belum aktif karena kredensial server belum lengkap." },
      { status: 503 },
    );
  }

  // Only published articles accept reactions.
  const { data: article, error: articleError } = await admin
    .from("articles")
    .select("id, status, published_at")
    .eq("id", articleId)
    .maybeSingle();

  if (articleError) {
    return NextResponse.json(
      { error: "Reaksi gagal disimpan." },
      { status: 500 },
    );
  }
  if (
    !article ||
    article.status !== "published" ||
    !article.published_at ||
    new Date(article.published_at) > new Date()
  ) {
    return NextResponse.json(
      { error: "Artikel ini tidak menerima reaksi." },
      { status: 404 },
    );
  }

  const sessionId = await ensureSessionId();

  if (active) {
    const { error } = await admin
      .from("reactions")
      .upsert(
        { article_id: articleId, session_id: sessionId, type },
        { onConflict: "article_id,session_id,type", ignoreDuplicates: true },
      );
    if (error) {
      return NextResponse.json({ error: "Reaksi gagal disimpan." }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("reactions")
      .delete()
      .eq("article_id", articleId)
      .eq("session_id", sessionId)
      .eq("type", type);
    if (error) {
      return NextResponse.json({ error: "Reaksi gagal dihapus." }, { status: 500 });
    }
  }

  // Counters are maintained by trigger; read them back for the optimistic UI.
  const reader = getPublicSupabase() ?? admin;
  const { data: counts } = await reader
    .from("articles")
    .select("like_count, save_count, share_count")
    .eq("id", articleId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    counts: {
      like: counts?.like_count ?? 0,
      save: counts?.save_count ?? 0,
      share: counts?.share_count ?? 0,
    },
  });
}
