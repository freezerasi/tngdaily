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
        href: "/kontribusi",
        label: "Kirim cerita",
        icon: PenLine,
        note: "Masuk moderasi editor",
      },
      {
        href: "/tentang",
        label: "Tentang TNG Daily",
        icon: Info,
        note: "Cara kami kerja, koreksi, AI",
      },
    ],
  },
  {
    heading: "Redaksi",
    items: [
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
    <Wall className="px-2 py-4">
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

      <BannerPanel ink="wall" lift="md" className="p-4 sm:p-5">
        <TapePatch tone="bone" tilt="left">
          Menu
        </TapePatch>
        <h1 className="tng-display mt-3 text-[2rem] leading-[0.92] sm:text-[2.75rem]">
          Semua halaman
        </h1>
      </BannerPanel>

      {GROUPS.map((group) => (
        <section key={group.heading} className="mt-3">
          <h2 className="tng-label px-1 pb-2 text-muted">{group.heading}</h2>
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
