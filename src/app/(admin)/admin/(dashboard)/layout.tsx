import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { WordMark } from "@/components/shared/word-mark";
import { TapePatch } from "@/components/shared/tape-patch";
import { getAuthState, displayNameOf } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/sign-out-button";

/**
 * Admin shell. Compact sidebar on desktop, header plus drawer on mobile.
 *
 * The login route has its own layout, so everything rendered here is already
 * behind middleware; this layout re-checks the session because middleware alone
 * is not an authorisation boundary for data.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await getAuthState();

  if (state.kind !== "authenticated") {
    redirect("/admin/login");
  }

  const { profile } = state.context;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r-2 border-keyline bg-wall-deep lg:flex lg:flex-col">
        <div className="border-b-2 border-keyline p-3">
          <WordMark size="sm" />
          <p className="tng-label mt-2 text-muted">Dashboard redaksi</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <AdminNav role={profile.role} />
        </div>
        <div className="border-t-2 border-line p-3">
          <p className="truncate font-display text-sm font-extrabold text-foreground">
            {displayNameOf(profile)}
          </p>
          <TapePatch tone="lime" size="sm" className="mt-1.5">
            {profile.role}
          </TapePatch>
          <div className="mt-3 grid gap-1.5">
            <Link
              href="/"
              className="tng-label text-muted transition-colors hover:text-foreground"
            >
              Lihat situs
            </Link>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b-2 border-keyline bg-wall/95 px-3 backdrop-blur-[2px] lg:hidden">
          <AdminMobileNav role={profile.role} name={displayNameOf(profile)} />
          <WordMark size="sm" />
          <span className="tng-label ml-auto text-muted">{profile.role}</span>
        </header>

        <main id="konten" className="flex-1 p-3 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
