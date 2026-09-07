import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { displayNameOf, requireRole } from "@/lib/auth";
import {
  isCloudinaryConfigured,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  siteUrl,
} from "@/lib/env";
import { configuredStockProviders } from "@/lib/images/stock";
import { secretStoreStatus } from "@/lib/ai/secrets";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Settings: an honest integration status board.
 *
 * Reports which integrations are configured, without printing any secret value.
 * Presence is derived from the server-only env module, so nothing here is
 * readable from the client bundle.
 */
export default async function SettingsPage() {
  const auth = await requireRole("editor", { returnTo: "/admin/settings" });

  const store = secretStoreStatus();
  const stock = configuredStockProviders();

  const checks = [
    {
      label: "Supabase (publik)",
      ready: isSupabaseConfigured(),
      detail: isSupabaseConfigured()
        ? "URL dan anon key terpasang. Semua akses publik dibatasi RLS."
        : "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset.",
    },
    {
      label: "Supabase service role",
      ready: isSupabaseAdminConfigured(),
      detail: isSupabaseAdminConfigured()
        ? "Tersedia di server. Dipakai untuk intake kontribusi, reaksi, dan penyimpanan referensi key AI."
        : "SUPABASE_SERVICE_ROLE_KEY belum diset. Form kontribusi dan penyimpanan key AI tidak akan jalan.",
    },
    {
      label: "Cloudinary",
      ready: isCloudinaryConfigured(),
      detail: isCloudinaryConfigured()
        ? "Upload bertanda tangan aktif. API secret tidak pernah dikirim ke browser."
        : "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET belum lengkap.",
    },
    {
      label: "Stock photo",
      ready: stock.length > 0,
      detail:
        stock.length > 0
          ? `Provider aktif: ${stock.join(", ")}. Key hanya dibaca di server lewat /api/images/search.`
          : "Belum ada UNSPLASH_ACCESS_KEY, PEXELS_API_KEY, atau PIXABAY_API_KEY.",
    },
    {
      label: "Secret store AI",
      ready: store.ready,
      detail: store.message,
    },
  ];

  return (
    <div className="grid gap-3">
      <header>
        <TapePatch tone="bone" tilt="left">
          Settings
        </TapePatch>
        <h1 className="tng-display mt-2 text-[2rem] leading-[0.92] sm:text-[2.5rem]">
          Status integrasi
        </h1>
        <p className="tng-measure mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
          Halaman ini hanya melaporkan apakah sebuah kredensial ada, bukan
          nilainya. Tidak ada secret yang ditampilkan di sini atau dikirim ke
          browser.
        </p>
      </header>

      <BannerPanel ink="deep" lift="sm" className="grid gap-2 p-3">
        <h2 className="tng-label text-muted">Akun kamu</h2>
        <p className="font-display text-base font-extrabold text-foreground">
          {displayNameOf(auth.profile)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <TapePatch tone="lime" size="sm">
            {auth.profile.role}
          </TapePatch>
          <span className="text-[0.75rem] text-muted">{auth.user.email}</span>
        </div>
        <p className="mt-1 text-[0.75rem] text-muted">
          Perubahan role dilakukan owner lewat RPC role management. Tidak ada
          pendaftaran publik dan tidak ada elevasi role langsung dari dashboard.
        </p>
      </BannerPanel>

      <section className="grid gap-2">
        <h2 className="tng-display text-xl">Integrasi</h2>
        <ul className="grid gap-2">
          {checks.map((check) => (
            <li key={check.label}>
              <BannerPanel
                ink="wall"
                lift="sm"
                className={cn("p-3", !check.ready && "border-orange")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <TapePatch tone={check.ready ? "lime" : "orange"} size="sm">
                    {check.ready ? "Siap" : "Belum"}
                  </TapePatch>
                  <span className="font-display text-[0.9375rem] font-extrabold text-foreground">
                    {check.label}
                  </span>
                </div>
                <p className="tng-measure mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
                  {check.detail}
                </p>
              </BannerPanel>
            </li>
          ))}
        </ul>
      </section>

      <BannerPanel ink="deep" lift="sm" className="grid gap-2 p-3">
        <h2 className="tng-label text-muted">Situs</h2>
        <p className="text-[0.8125rem] text-muted">
          Base URL: <span className="font-mono text-foreground">{siteUrl}</span>
        </p>
        <p className="text-[0.75rem] text-muted">
          Base URL dipakai untuk canonical, sitemap, dan JSON-LD. Pastikan sama
          dengan domain produksi sebelum deploy.
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/sitemap.xml" target="_blank" rel="noreferrer">
              Lihat sitemap
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/robots.txt" target="_blank" rel="noreferrer">
              Lihat robots.txt
            </Link>
          </Button>
        </div>
      </BannerPanel>

      {auth.profile.role === "owner" ? (
        <BannerPanel ink="deep" lift="sm" className="grid gap-2 p-3">
          <h2 className="tng-label text-muted">Khusus owner</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/ai">Konfigurasi AI</Link>
            </Button>
          </div>
        </BannerPanel>
      ) : null}
    </div>
  );
}
