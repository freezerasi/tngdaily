import { NextResponse, type NextRequest } from "next/server";

import { getAdminSupabase } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/env";
import {
  RATE_LIMITS,
  rateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { clientAddressFrom, hashClientIdentifier } from "@/lib/security/session";
import {
  contributionFormSchema,
  kirimBeritaFormSchema,
  fieldErrors,
} from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Community contribution intake.
 *
 * There is no anon insert policy on `contributions`, so submissions must pass
 * through here. Two layers of throttling: an in-memory window per instance, and
 * a database count per hashed submitter which survives instance churn.
 */
const DB_WINDOW_HOURS = 24;
const DB_WINDOW_LIMIT = 6;

export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Form belum aktif: server belum punya kredensial database. Hubungi admin TNG Daily.",
      },
      { status: 503 },
    );
  }

  const ipHash = hashClientIdentifier(clientAddressFrom(request.headers));
  const memoryLimit = rateLimit(
    `contributions:${ipHash}`,
    RATE_LIMITS.contributions.limit,
    RATE_LIMITS.contributions.windowMs,
  );
  if (!memoryLimit.ok) {
    return tooManyRequests(
      memoryLimit,
      "Kamu sudah mengirim beberapa kiriman. Coba lagi nanti.",
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const isKirimBerita =
    body !== null &&
    typeof body === "object" &&
    ("fullName" in body || "displayName" in body || "whatsapp" in body);

  let insertData: {
    contributor_name: string;
    contributor_contact: string | null;
    title: string;
    content: string;
    pillar: "vibes" | "suara" | "hustle" | "story";
    location: string | null;
    media_urls: string[];
    consent_publish: boolean;
    consent_edit: boolean;
    status: "pending";
    submitter_hash: string;
  };

  if (isKirimBerita) {
    const parsed = kirimBeritaFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data kiriman belum lengkap.", fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }
    const val = parsed.data;
    insertData = {
      contributor_name: val.displayName.slice(0, 80),
      contributor_contact: `${val.email} | WA: ${val.whatsapp} (${val.fullName})`.slice(0, 120),
      title: val.title,
      content: val.content,
      pillar: "suara",
      location: val.district || null,
      media_urls: val.mediaUrl ? [val.mediaUrl] : [],
      consent_publish: true,
      consent_edit: true,
      status: "pending",
      submitter_hash: ipHash,
    };
  } else {
    const parsed = contributionFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data kiriman belum lengkap.", fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }
    const val = parsed.data;
    insertData = {
      contributor_name: val.contributorName,
      contributor_contact: val.contributorContact || null,
      title: val.title,
      content: val.content,
      pillar: val.pillar,
      location: val.location || null,
      media_urls: val.mediaUrls,
      consent_publish: val.consentPublish,
      consent_edit: val.consentEdit,
      status: "pending",
      submitter_hash: ipHash,
    };
  }

  const admin = getAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Kiriman gagal disimpan." }, { status: 503 });
  }

  const since = new Date(
    Date.now() - DB_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { count, error: countError } = await admin
    .from("contributions")
    .select("id", { count: "exact", head: true })
    .eq("submitter_hash", ipHash)
    .gte("created_at", since);

  if (countError) {
    return NextResponse.json({ error: "Kiriman gagal disimpan." }, { status: 500 });
  }
  if ((count ?? 0) >= DB_WINDOW_LIMIT) {
    return NextResponse.json(
      {
        error:
          "Batas kiriman harian tercapai. Kalau ini keliru, hubungi redaksi lewat halaman kontak.",
      },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const { error } = await admin.from("contributions").insert(insertData);

  if (error) {
    return NextResponse.json(
      { error: "Kiriman gagal disimpan. Coba lagi beberapa saat lagi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
