import { NextResponse, type NextRequest } from "next/server";

import { getApiAuth } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/server";
import { extractSources } from "@/lib/ai/extract";
import {
  RATE_LIMITS,
  rateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { rewriteExtractSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Source extraction endpoint for the Rewrite Studio.
 *
 * Every URL is SSRF-checked, size-capped, timeout-bounded, and redirect-limited
 * inside `extractSources`. A failed URL returns its own error so the editor can
 * replace just that source instead of losing the whole batch. The created
 * `rewrite_jobs` row is the audit trail for what was fetched.
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuth("editor");
  if (!auth) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const limit = rateLimit(
    `extract:${auth.profile.id}`,
    RATE_LIMITS.extract.limit,
    RATE_LIMITS.extract.windowMs,
  );
  if (!limit.ok) {
    return tooManyRequests(limit, "Terlalu banyak permintaan ekstraksi.");
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = rewriteExtractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Daftar URL tidak valid. Maksimal lima URL http atau https." },
      { status: 400 },
    );
  }

  let sources;
  try {
    sources = await extractSources(parsed.data.urls);
  } catch {
    return NextResponse.json(
      { error: "Ekstraksi sumber gagal total. Coba lagi dengan URL berbeda." },
      { status: 502 },
    );
  }

  const succeeded = sources.filter((source) => source.ok);

  const admin = getAdminSupabase();
  let jobId: string | null = null;

  if (admin) {
    // The job row is an audit trail, not a hard dependency: the editor still
    // gets the extraction result when the database write fails, and synthesis
    // is simply unavailable until a successful retry. The write is wrapped
    // because a network-level failure throws instead of returning an error.
    try {
      const { data, error: insertError } = await admin
        .from("rewrite_jobs")
        .insert({
          source_urls: parsed.data.urls,
          // Store metadata and text so the synthesis stage can be resumed and
          // audited without re-fetching the source sites.
          extracted_content: sources,
          status: succeeded.length > 0 ? "processing" : "failed",
          error_message:
            succeeded.length > 0
              ? null
              : "Tidak ada URL yang berhasil diekstrak.",
          created_by: auth.profile.id,
        })
        .select("id")
        .maybeSingle();

      if (insertError) {
        console.error("rewrite extract: job insert failed:", insertError.message);
      } else {
        jobId = (data as { id: string } | null)?.id ?? null;
      }
    } catch (caught) {
      console.error("rewrite extract: job insert threw:", caught);
    }
  }

  return NextResponse.json({
    jobId,
    sources: sources.map((source) => ({
      url: source.url,
      finalUrl: source.finalUrl,
      ok: source.ok,
      siteName: source.siteName,
      title: source.title,
      byline: source.byline,
      publishedTime: source.publishedTime,
      excerpt: source.excerpt,
      wordCount: source.wordCount,
      // A short preview only: the full text stays server-side in the job row.
      preview: source.text.slice(0, 600),
      error: source.error,
    })),
    successCount: succeeded.length,
    failureCount: sources.length - succeeded.length,
  });
}
