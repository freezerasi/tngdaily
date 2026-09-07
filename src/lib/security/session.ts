import "server-only";

import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";

import { isProduction, supabaseConfig } from "@/lib/env";

/**
 * Anonymous reader identity.
 *
 * The identifier is generated on the server, stored in an httpOnly cookie, and
 * never exposed to client JavaScript. It exists only to make a like idempotent;
 * it carries no profile data and is not used for tracking across sites.
 */

export const SESSION_COOKIE = "tng_sid";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  return value && value.length >= 16 ? value : null;
}

/**
 * Returns the existing identifier, or issues one. Only callable from a Route
 * Handler or Server Action, since it writes a cookie.
 */
export async function ensureSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing && existing.length >= 16) return existing;

  const fresh = randomBytes(16).toString("hex");
  store.set(SESSION_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return fresh;
}

/**
 * One-way hash of a client address, used for contribution rate limiting.
 * Salted with a server-only secret so the hash cannot be reversed by anyone who
 * only obtains the database.
 */
export function hashClientIdentifier(value: string): string {
  const salt = supabaseConfig.serviceRoleKey ?? "tngdaily-local-salt";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}

/** Best-effort client address from proxy headers. */
export function clientAddressFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}
