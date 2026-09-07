"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coins,
  House,
  Menu,
  Megaphone,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Bottom navigation, mobile only. Sits in the thumb zone and re-signs the
 * current corridor with a lime tick above the active item, not colour alone.
 * On desktop the top bar carries navigation instead.
 */
const ITEMS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  {
    href: "/vibes",
    label: "Vibes",
    icon: Sparkles,
    match: (p: string) => p.startsWith("/vibes"),
  },
  {
    href: "/suara",
    label: "Suara",
    icon: Megaphone,
    match: (p: string) => p.startsWith("/suara"),
  },
  {
    href: "/hustle",
    label: "Hustle",
    icon: Coins,
    match: (p: string) => p.startsWith("/hustle"),
  },
  {
    href: "/menu",
    label: "Menu",
    icon: Menu,
    match: (p: string) => p.startsWith("/menu") || p.startsWith("/tentang"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 lg:hidden",
        "border-t-2 border-keyline bg-wall-deep/97 backdrop-blur-[2px]",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1",
                  isActive ? "text-lime" : "text-muted hover:text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-[3px] w-7 rounded-full transition-colors",
                    isActive ? "bg-lime" : "bg-transparent",
                  )}
                />
                <Icon aria-hidden="true" className="size-5" strokeWidth={2.4} />
                <span className="tng-label text-[0.5625rem] leading-none">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
