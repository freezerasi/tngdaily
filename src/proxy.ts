import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const LOGIN_PATH = "/admin/login";

/**
 * Request gate for the whole CMS (the `proxy` file convention in Next 16,
 * previously `middleware`).
 *
 * Two jobs: refresh the Supabase auth session on every request so a reader's
 * token does not expire mid-visit, and keep unauthenticated visitors out of
 * /admin. This is navigation-level protection only; every page and route
 * handler re-checks the role with `requireRole` or `getApiAuth`, because
 * middleware is not an authorisation boundary for data.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { response, userId, configured } = await updateSession(request);

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
    if (userId) {
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

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|avif|svg|gif|ico|woff2?)$).*)",
  ],
};
