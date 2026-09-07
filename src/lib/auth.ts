import "server-only";

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
  | { kind: "authenticated"; context: AuthContext };

/**
 * Resolves the caller's session and profile row. Returns a discriminated state
 * rather than throwing, so a page can render a setup or login state instead of
 * a stack trace when Supabase is not wired up yet.
 */
export async function getAuthState(): Promise<AuthState> {
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

  return {
    kind: "authenticated",
    context: {
      supabase,
      user,
      profile: {
        id: user.id,
        username: data?.username ?? null,
        displayName:
          data?.display_name ?? user.email?.split("@")[0] ?? null,
        role,
      },
    },
  };
}

/**
 * Page-level guard. Redirects unauthenticated callers to the login screen and
 * under-privileged callers to the access-denied screen.
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

  if (!roleAtLeast(state.context.profile.role, minimum)) {
    redirect(`/admin/akses-ditolak?butuh=${minimum}`);
  }

  return state.context;
}

/** Route-handler guard. Returns null instead of redirecting. */
export async function getApiAuth(minimum: UserRole): Promise<AuthContext | null> {
  const state = await getAuthState();
  if (state.kind !== "authenticated") return null;
  if (!roleAtLeast(state.context.profile.role, minimum)) return null;
  return state.context;
}

export function displayNameOf(profile: ProfileView): string {
  return profile.displayName ?? profile.username ?? "Editor";
}
