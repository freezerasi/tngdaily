import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Coins,
  House,
  Info,
  Megaphone,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { BannerPanel, Wall } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { PILLAR_INK } from "@/lib/pillar-ink";
import { staticPageJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PAGE_DESCRIPTION = "Semua halaman TNG Daily dalam satu tempat.";

export const metadata: Metadata = {
  title: "Menu",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/menu" },
};

/**
 * Menu. The bottom nav's fifth slot on mobile: a full index instead of a
 * cramped overflow sheet, which keeps every destination reachable by thumb.
 */
const GROUPS = [
  {
    heading: "Baca",
    items: [
      { href: "/", label: "Feed utama", icon: House, note: "Semua pilar" },
      {
        href: "/vibes",
        label: "TNG Vibes",
        icon: Sparkles,
        note: "Kuliner, nongkrong, event",
        ink: "vibes" as const,
      },
      {
        href: "/suara",
        label: "Suara Tangerang",
        icon: Megaphone,
        note: "Isu kota, transportasi",
        ink: "suara" as const,
      },
      {
        href: "/hustle",
        label: "TNG Hustle",
        icon: Coins,
        note: "Loker, UMKM, biaya hidup",
        ink: "hustle" as const,
      },
      {
        href: "/story",
        label: "TNG Story",
        icon: BookOpen,
        note: "Cerita warga",
        ink: "story" as const,
      },
      { href: "/cari", label: "Cari artikel", icon: Search, note: "Berdasarkan judul" },
    ],
  },
  {
    heading: "Ikut terlibat",
    items: [
      {
        href: "/kirim-berita",
        label: "Kirim berita",
        icon: PenLine,
        note: "Panduan dan formulir kontributor warga",
      },
      {
        href: "/tentang-kami",
        label: "Tentang TNG Daily",
        icon: Info,
        note: "Media digital anak muda Tangerang",
      },
      {
        href: "/redaksi",
        label: "Susunan Redaksi",
        icon: ShieldCheck,
        note: "Pemimpin Redaksi, Redaktur Pelaksana, Redaktur Komunitas",
      },
      {
        href: "/kontak",
        label: "Kontak Redaksi",
        icon: Megaphone,
        note: "Kanal resmi dan kantor Karawaci",
      },
    ],
  },
  {
    heading: "Standar & Legal",
    items: [
      {
        href: "/kode-etik",
        label: "Kode Etik",
        icon: ShieldCheck,
        note: "Standar jurnalistik dan aturan main",
      },
      {
        href: "/kebijakan-privasi",
        label: "Kebijakan Privasi",
        icon: ShieldCheck,
        note: "Pelindungan data pembaca dan kontributor",
      },
      {
        href: "/admin",
        label: "Masuk dashboard",
        icon: ShieldCheck,
        note: "Khusus editor dan owner",
      },
    ],
  },
] as const;

export default function MenuPage() {
  return (
    <Wall rail={false} className="mx-auto max-w-2xl px-3 py-6 sm:px-4 break-words">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            staticPageJsonLd({
              path: "/menu",
              title: "Menu TNG Daily",
              description: PAGE_DESCRIPTION,
              breadcrumbName: "Menu",
            }),
          ),
        }}
      />

      <BannerPanel ink="wall" lift="md" className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <TapePatch tone="bone" tilt="left">
              Menu Navigasi
            </TapePatch>
            <h1 className="tng-display mt-3 text-[2rem] leading-[0.98] sm:text-[2.75rem] text-foreground">
              Semua halaman
            </h1>
            <p className="mt-2 text-xs text-muted">
              Tekan tombol Menu di bawah atau ikon silang untuk kembali ke Beranda.
            </p>
          </div>
          <Link
            href="/"
            aria-label="Tutup menu dan kembali ke beranda"
            className="inline-flex size-9 items-center justify-center border-2 border-line bg-surface text-muted transition-colors hover:border-lime hover:text-foreground shrink-0"
          >
            <span className="font-mono text-sm font-bold">&times;</span>
          </Link>
        </div>
      </BannerPanel>

      {GROUPS.map((group) => (
        <section key={group.heading} className="mt-4">
          <h2 className="tng-label px-2 pb-2 text-muted uppercase tracking-wider text-[0.75rem]">
            {group.heading}
          </h2>
          <ul className="grid gap-2">
            {group.items.map((item) => {
              const Icon = item.icon;
              const accent =
                "ink" in item && item.ink
                  ? PILLAR_INK[item.ink].accentBar
                  : "bg-line";
              return (
                <li key={item.href}>
                  <BannerPanel ink="deep" lift="sm">
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 p-3.5"
                    >
                      <span
                        aria-hidden="true"
                        className={cn("h-10 w-1.5 shrink-0", accent)}
                      />
                      <Icon
                        aria-hidden="true"
                        className="size-5 shrink-0 text-muted"
                        strokeWidth={2.4}
                      />
                      <span className="min-w-0">
                        <span className="block font-display text-[0.9375rem] font-extrabold text-foreground">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] text-muted">
                          {item.note}
                        </span>
                      </span>
                    </Link>
                  </BannerPanel>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Wall>
  );
}
