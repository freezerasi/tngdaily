import { NextResponse } from "next/server";

import { getApiAuth } from "@/lib/auth";
import { resolveCandidates } from "@/lib/ai/gateway";
import { secretStoreStatus } from "@/lib/ai/secrets";

export const runtime = "nodejs";

/**
 * AI readiness probe for the studio screens.
 *
 * Returns whether a usable provider chain exists and which providers are in it,
 * so a studio can show an actionable state before an editor writes a brief.
 * Deliberately exposes provider names and models only: no keys, no previews, no
 * vault references.
 */
export async function GET() {
  const auth = await getApiAuth("editor");
  if (!auth) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const [candidates, store] = [await resolveCandidates(), secretStoreStatus()];

  return NextResponse.json({
    ready: candidates.length > 0 && store.ready,
    secretStore: { driver: store.driver, ready: store.ready, message: store.message },
    chain: candidates.map((candidate, index) => ({
      order: index + 1,
      providerName: candidate.providerName,
      model: candidate.model,
      isLocalFallback: candidate.isLocalFallback,
    })),
  });
}
