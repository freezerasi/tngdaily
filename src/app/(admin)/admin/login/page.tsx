import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { SetupNotice } from "@/components/shared/empty-state";
import { WordMark } from "@/components/shared/word-mark";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Masuk redaksi",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  // Only same-origin relative paths inside /admin are accepted as a return
  // target, so the login page cannot be turned into an open redirect.
  const next =
    rawNext && /^\/admin(?:\/[\w\-/[\]]*)?(?:\?[\w=&%.-]*)?$/.test(rawNext)
      ? rawNext
      : "/admin";

  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-dvh items-center justify-center p-3">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex flex-col items-start gap-3">
          <WordMark size="lg" />
          <TapePatch tone="lime" tilt="left">
            Dashboard redaksi
          </TapePatch>
        </div>

        {configured ? (
          <BannerPanel ink="wall" lift="lg" grommets className="p-5">
            <h1 className="tng-display text-2xl">Masuk</h1>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
              Akun dibuat oleh admin lewat Supabase Auth. Tidak ada pendaftaran
              publik.
            </p>
            <LoginForm next={next} />
          </BannerPanel>
        ) : (
          <SetupNotice
            title="Supabase belum dikonfigurasi"
            description="Dashboard memerlukan Supabase Auth. Isi kredensial di .env.local, jalankan seluruh migration di supabase/migrations, lalu buat user pertama dari dashboard Supabase dan bootstrap owner sesuai docs/OWNER_BOOTSTRAP.md."
            envKeys={[
              "NEXT_PUBLIC_SUPABASE_URL",
              "NEXT_PUBLIC_SUPABASE_ANON_KEY",
              "SUPABASE_SERVICE_ROLE_KEY",
            ]}
            docHint="Gunakan bootstrap owner, lalu kelola role berikutnya lewat RPC role management."
          />
        )}
      </div>
    </div>
  );
}
