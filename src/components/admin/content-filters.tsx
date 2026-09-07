"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { BannerPanel } from "@/components/shared/banner-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { articleStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PILLAR_META, type ArticleStatus, type Pillar } from "@/types/domain";

/**
 * Content list filters. State lives in the URL so a filtered view is
 * shareable and the list itself stays a Server Component.
 */
export function ContentFilters({
  statuses,
  pillars,
  activeStatus,
  activePillar,
  search,
}: {
  statuses: readonly ArticleStatus[];
  pillars: readonly Pillar[];
  activeStatus: ArticleStatus | "all";
  activePillar: Pillar | "all";
  search?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = React.useState(search ?? "");

  const hrefFor = React.useCallback(
    (overrides: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      next.delete("page");
      for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      return query ? `/admin/konten?${query}` : "/admin/konten";
    },
    [params],
  );

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = term.trim().slice(0, 80);
    router.push(hrefFor({ q: clean || undefined }));
  };

  const hasFilters =
    activeStatus !== "all" || activePillar !== "all" || Boolean(search);

  return (
    <BannerPanel ink="deep" lift="sm" className="grid gap-3 p-3">
      <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
        <label htmlFor="admin-search" className="sr-only">
          Cari judul artikel
        </label>
        <Input
          id="admin-search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Cari judul"
          className="min-w-0 flex-1 sm:max-w-xs"
          maxLength={80}
        />
        <Button type="submit" variant="outline" size="md">
          <Search aria-hidden="true" />
          Cari
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="md">
            <Link href="/admin/konten">
              <X aria-hidden="true" />
              Reset
            </Link>
          </Button>
        ) : null}
      </form>

      <div className="grid gap-2">
        <FilterRow label="Status">
          <FilterChip
            href={hrefFor({ status: undefined })}
            isActive={activeStatus === "all"}
          >
            Semua
          </FilterChip>
          {statuses.map((status) => (
            <FilterChip
              key={status}
              href={hrefFor({ status })}
              isActive={activeStatus === status}
            >
              {articleStatusLabel(status)}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Pilar">
          <FilterChip
            href={hrefFor({ pillar: undefined })}
            isActive={activePillar === "all"}
          >
            Semua
          </FilterChip>
          {pillars.map((pillar) => (
            <FilterChip
              key={pillar}
              href={hrefFor({ pillar })}
              isActive={activePillar === pillar}
            >
              {PILLAR_META[pillar].label}
            </FilterChip>
          ))}
        </FilterRow>
      </div>
    </BannerPanel>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="tng-label w-12 shrink-0 text-muted">{label}</span>
      <div className="tng-scroll-x flex gap-1.5 py-0.5">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[2px] border-2 px-2.5",
        "font-display text-[0.625rem] font-extrabold uppercase tracking-[0.1em]",
        "transition-colors",
        isActive
          ? "border-keyline bg-bone text-ink shadow-[var(--shadow-hard-sm)]"
          : "border-line bg-surface text-muted hover:border-keyline hover:text-foreground",
      )}
    >
      {isActive ? <span aria-hidden="true" className="size-1.5 bg-ink" /> : null}
      {children}
    </Link>
  );
}
