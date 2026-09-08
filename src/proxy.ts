import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const LOGIN_PATH = "/admin/login";

/**
 * Request gate for the whole CMS (the `proxy` file convention in Next 16,
 * previously `middleware`).
 *
 * Two jobs on protected routes: refresh the Supabase auth session before
 * request-bound server reads, and keep unauthenticated visitors out of /admin.
 * Public editorial pages stay outside the matcher so they can keep CDN/browser
 * caching and bfcache eligibility.
 *
 * This is navigation-level protection only; every page, action, and route
 * handler re-checks the role with `requireRole` or `getApiAuth`, because
 * proxy is not an authorisation boundary for data.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { response, userId, aal, mfaEnrolled, configured } =
    await updateSession(request);

  // A session at AAL1 whose user has verified MFA factors has not completed
  // the second step. Admin pages must not render for it; send it back to the
  // login screen, which carries the MFA challenge step.
  const mfaPending = Boolean(userId) && mfaEnrolled && aal !== "aal2";

  if (!pathname.startsWith("/admin")) {
    return response;
  }

  // Without Supabase credentials the CMS cannot authenticate anyone. Send every
  // admin route to the login screen, which renders the setup instructions.
  if (!configured) {
    if (pathname === LOGIN_PATH) return response;
    const target = request.nextUrl.clone();
    target.pathname = LOGIN_PATH;
    target.search = "";
    return NextResponse.redirect(target);
  }

  if (pathname === LOGIN_PATH) {
    // A fully signed-in user (AAL2 or no factors enrolled) never needs the
    // login screen; keep the existing redirect to the dashboard.
    if (userId && !mfaPending) {
      const target = request.nextUrl.clone();
      target.pathname = "/admin";
      target.search = "";
      return NextResponse.redirect(target);
    }
    return response;
  }

  if (!userId) {
    const target = request.nextUrl.clone();
    target.pathname = LOGIN_PATH;
    target.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    const redirect = NextResponse.redirect(target);
    // Carry over refreshed auth cookies so the login page sees current state.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  if (mfaPending) {
    const target = request.nextUrl.clone();
    target.pathname = LOGIN_PATH;
    target.search = `?mfa=required&next=${encodeURIComponent(`${pathname}${search}`)}`;
    const redirect = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Only routes that depend on the caller's Supabase auth cookies. Keeping
     * public pages out avoids no-store responses from session refreshes.
     */
    "/admin/:path*",
    "/api/ai/:path*",
    "/api/images/:path*",
    "/api/rewrite/:path*",
    "/test-roles/:path*",
  ],
};
