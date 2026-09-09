import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getServerSupabase } from "@/lib/supabase/server";
import type { ProfileView } from "@/lib/data/types";
import { highestUserRole, roleAtLeast, type UserRole } from "@/types/domain";

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
  profile: ProfileView;
}

export type AuthState =
  | { kind: "unconfigured" }
  | { kind: "anonymous" }
  | { kind: "authenticated"; context: AuthContext }
  | { kind: "mfaRequired"; context: AuthContext };

/**
 * Resolves the caller's session and profile row. Returns a discriminated state
 * rather than throwing, so a page can render a setup or login state instead of
 * a stack trace when Supabase is not wired up yet.
 *
 * Cached per request: the admin layout and the page below it both resolve auth
 * (plus every API guard in the same render), but the session only needs one
 * `getUser` round trip. React `cache()` dedupes them into a single call.
 */
export const getAuthState = cache(async function getAuthState(): Promise<AuthState> {
  const supabase = await getServerSupabase();
  if (!supabase) return { kind: "unconfigured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  const [{ data }, { data: roleKeys }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("tng_current_role_keys"),
  ]);

  const role = highestUserRole((roleKeys ?? []) as unknown[]);

  const context: AuthContext = {
    supabase,
    user,
    profile: {
      id: user.id,
      username: data?.username ?? null,
      displayName:
        data?.display_name ?? user.email?.split("@")[0] ?? null,
      role,
    },
  };

  // MFA enforcement (opt-in per user): a session at AAL1 whose user has at
  // least one verified MFA factor is not yet trusted for the CMS. The client
  // SDK computes the assurance level from the session JWT + user factors, so
  // this adds no extra network round-trip.
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const hasVerifiedFactor = (user.factors ?? []).some(
    (factor) => factor.status === "verified",
  );
  if (
    hasVerifiedFactor &&
    aalData &&
    (aalData.currentLevel ?? "aal1") !== "aal2"
  ) {
    return { kind: "mfaRequired", context };
  }

  return { kind: "authenticated", context };
});

/**
 * Page-level guard. Redirects unauthenticated callers to the login screen,
 * MFA-pending sessions to the MFA challenge step, and under-privileged
 * callers to the access-denied screen.
 */
export async function requireRole(
  minimum: UserRole,
  options: { returnTo?: string } = {},
): Promise<AuthContext> {
  const state = await getAuthState();

  if (state.kind === "unconfigured" || state.kind === "anonymous") {
    const next = options.returnTo ? `?next=${encodeURIComponent(options.returnTo)}` : "";
    redirect(`/admin/login${next}`);
  }

  if (state.kind === "mfaRequired") {
    const next = options.returnTo ? `&next=${encodeURIComponent(options.returnTo)}` : "";
    redirect(`/admin/login?mfa=required${next}`);
  }

  if (!roleAtLeast(state.context.profile.role, minimum)) {
    redirect(`/admin/akses-ditolak?butuh=${minimum}`);
  }

  return state.context;
}

/** Route-handler guard. Returns null instead of redirecting. */
export async function getApiAuth(minimum: UserRole): Promise<AuthContext | null> {
  const state = await getAuthState();
  // Also rejects `mfaRequired`: an AAL1 session with verified factors must
  // not reach any data until the second factor is confirmed.
  if (state.kind !== "authenticated") return null;
  if (!roleAtLeast(state.context.profile.role, minimum)) return null;
  return state.context;
}

export function displayNameOf(profile: ProfileView): string {
  return profile.displayName ?? profile.username ?? "Editor";
}
