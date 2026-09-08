"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const ABOUT_LINKS = [
  {
    href: "/tentang-kami",
    label: "Tentang Kami",
    desc: "Misi, visi, dan cerita media lokal Tangerang.",
  },
  {
    href: "/redaksi",
    label: "Redaksi",
    desc: "Susunan tim redaksi dan penanggung jawab isi.",
  },
  {
    href: "/kode-etik",
    label: "Kode Etik",
    desc: "Standar jurnalistik dan aturan main liputan.",
  },
  {
    href: "/pedoman-redaksi",
    label: "Pedoman Redaksi",
    desc: "SOP verifikasi, ralat terang, dan hak jawab.",
  },
] as const;

export function AboutDropdown() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  const isAboutActive =
    pathname.startsWith("/tentang-kami") ||
    pathname.startsWith("/redaksi") ||
    pathname.startsWith("/kode-etik") ||
    pathname.startsWith("/pedoman-redaksi");

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={cn(
            "group inline-flex items-center gap-1.5 px-3 py-1.5",
            "font-display text-[0.8125rem] font-extrabold uppercase tracking-[0.14em]",
            "border transition-all duration-150 ease-out cursor-pointer",
            isAboutActive || open
              ? "border-lime bg-lime/10 text-lime"
              : "border-transparent text-foreground/90 hover:border-lime hover:bg-lime/10",
          )}
        >
          <span>Tentang</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 transition-transform duration-200",
              open ? "rotate-180 text-lime" : "text-muted group-hover:text-foreground",
            )}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className={cn(
            "z-50 min-w-[14rem] border-2 border-keyline bg-wall-deep p-1.5",
            "shadow-[4px_4px_0px_0px_#000000] focus:outline-none",
            "animate-in fade-in-0 zoom-in-95 duration-100",
          )}
        >
          {ABOUT_LINKS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <DropdownMenu.Item key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col gap-0.5 px-3 py-2 text-left transition-colors cursor-pointer",
                    "border-l-2",
                    isActive
                      ? "border-lime bg-surface-strong text-lime"
                      : "border-transparent text-foreground/90 hover:border-lime hover:bg-surface hover:text-foreground",
                  )}
                >
                  <span className="font-display text-[0.8125rem] font-bold uppercase tracking-wider">
                    {item.label}
                  </span>
                  <span className="text-[0.6875rem] text-muted">
                    {item.desc}
                  </span>
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
