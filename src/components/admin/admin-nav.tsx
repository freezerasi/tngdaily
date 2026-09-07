"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  FileText,
  Inbox,
  LayoutDashboard,
  RefreshCcw,
  Settings,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { roleAtLeast, type UserRole } from "@/types/domain";

/**
 * Admin navigation. Items declare the minimum role they need, so a contributor
 * never sees a link that would redirect them to access denied.
 */
interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole: UserRole;
  exact?: boolean;
}

const ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    minRole: "editor",
    exact: true,
  },
  { href: "/admin/konten", label: "Konten", icon: FileText, minRole: "editor" },
  {
    href: "/admin/kontribusi",
    label: "Kontribusi",
    icon: Inbox,
    minRole: "editor",
  },
  {
    href: "/admin/ai/content-studio",
    label: "Content Studio",
    icon: Sparkles,
    minRole: "editor",
  },
  {
    href: "/admin/ai/rewrite-studio",
    label: "Rewrite Studio",
    icon: RefreshCcw,
    minRole: "editor",
  },
  {
    href: "/admin/ai",
    label: "Konfigurasi AI",
    icon: BrainCircuit,
    minRole: "owner",
    exact: true,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    minRole: "editor",
  },
];

export function AdminNav({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi dashboard" className="grid gap-1">
      {ITEMS.filter((item) => roleAtLeast(role, item.minRole)).map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-[3px] border-2 px-2.5",
              "font-display text-[0.75rem] font-extrabold uppercase tracking-[0.08em]",
              "transition-colors",
              isActive
                ? "border-keyline bg-lime text-ink shadow-[var(--shadow-hard-sm)]"
                : "border-transparent text-muted hover:border-line hover:bg-surface hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.4} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
