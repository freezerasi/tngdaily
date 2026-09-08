import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session for protected routes and returns both the
 * mutated response (carrying refreshed cookies) and the resolved user id.
 *
 * Runs in the Edge middleware, so it reads `process.env` directly rather than
 * importing the server-only env module.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
  aal: string | null;
  mfaEnrolled: boolean;
  configured: boolean;
}> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { response, userId: null, aal: null, mfaEnrolled: false, configured: false };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  // Supabase JWTs carry `aal` but no "user has verified factors" claim. The
  // assurance-level helper reads it from the session JWT and user factors
  // stored in the cookie-bound client, without a network round-trip.
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  return {
    response,
    userId: data?.claims.sub ?? null,
    aal: (data?.claims.aal as string | undefined) ?? null,
    // nextLevel is aal2 only when the account has at least one verified factor.
    mfaEnrolled: aalData?.nextLevel === "aal2",
    configured: true,
  };
}
