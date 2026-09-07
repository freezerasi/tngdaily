import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/env";

/**
 * Server-side Supabase clients.
 *
 * `getServerSupabase` is bound to the request's auth cookies and therefore
 * still constrained by RLS. `getAdminSupabase` uses the service role and
 * bypasses RLS: it is only for routes that have already checked authorisation
 * themselves (contribution intake, AI key handling, view counters).
 */

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const { url, anonKey } = supabaseConfig;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render: the middleware already
          // refreshed the session, so ignoring this is correct.
        }
      },
    },
  });
}

/**
 * Read-only server client that never attempts to write auth cookies. Use in
 * cached/static rendering paths such as sitemap generation.
 */
export function getPublicSupabase(): SupabaseClient | null {
  const { url, anonKey } = supabaseConfig;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let adminClient: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient | null {
  const { url, serviceRoleKey } = supabaseConfig;
  if (!url || !serviceRoleKey) return null;

  adminClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "tngdaily-server" } },
  });
  return adminClient;
}
