import type { Metadata } from "next";
import Link from "next/link";

import { BannerPanel, Wall } from "@/components/shared/banner-panel";
import { StaticBreadcrumb } from "@/components/public/static-breadcrumb";
import { TapePatch } from "@/components/shared/tape-patch";
import { PartnerCard } from "@/components/editorial/partner-card";
import { PartnerAdvertisingCta } from "@/components/editorial/partner-advertising-cta";
import { Button } from "@/components/ui/button";
import { getPartnerStories } from "@/lib/data/partners";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Partner Stories (Advertorial) | TNG Daily",
  description:
    "Arsip cerita kerja sama, advertorial, profil UMKM, dan inisiatif komersial bersama mitra TNG Daily di Tangerang Raya.",
  alternates: { canonical: "/partner" },
  robots: { index: true, follow: true },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_SIZE = 10;

export default async function PartnerArchivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = typeof params.page === "string" ? params.page : "1";
  const rawCategory = typeof params.kategori === "string" ? params.kategori : "Semua";

  const allStories = await getPartnerStories();

  // Distinct categories
  const categories = ["Semua", ...Array.from(new Set(allStories.map((s) => s.category)))];

  // Filter by category
  const filtered =
    rawCategory && rawCategory !== "Semua"
      ? allStories.filter(
          (item) => item.category.toLowerCase() === rawCategory.toLowerCase(),
        )
      : allStories;

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, parseInt(rawPage, 10) || 1), totalPages);
  const pagedStories = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function buildHref(targetPage: number, targetCat?: string) {
    const query = new URLSearchParams();
    const cat = targetCat !== undefined ? targetCat : rawCategory;
    if (cat && cat !== "Semua") {
      query.set("kategori", cat);
    }
    if (targetPage > 1) {
      query.set("page", String(targetPage));
    }
    const qs = query.toString();
    return qs ? `/partner?${qs}` : "/partner";
  }

  return (
    <Wall className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8" rail={false}>
      {/* Breadcrumb */}
      <StaticBreadcrumb currentPage="Partner Stories" />

      {/* Hero Header */}
      <header className="mb-8">
        <BannerPanel
          ink="bone"
          lift="lg"
          grommets
          className="p-5 sm:p-7 md:p-8"
        >
          <div className="flex flex-wrap items-center gap-2">
            <TapePatch tone="wall" tilt="left" size="sm">
              ADVERTORIAL & MITRA
            </TapePatch>
            <span className="inline-flex items-center border border-ink/40 px-1.5 py-0.5 font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.14em] text-ink/80">
              KONTEN BERBAYAR
            </span>
          </div>

          <h1 className="tng-display mt-4 text-[2.25rem] leading-[0.9] tracking-tight text-ink sm:text-[3.25rem] md:text-[3.75rem]">
            PARTNER STORIES
          </h1>

          <p className="mt-3.5 max-w-3xl text-sm leading-relaxed text-ink/80 sm:text-base">
            Ruang kerja sama komersial antara TNG Daily bersama brand, UMKM lokal, festival,
            dan inisiatif kreatif di Tangerang Raya. Seluruh tulisan di rubrik ini disusun
            secara transparan dengan standar bercerita yang relevan dan diproduksi terpisah
            dari liputan redaksi independen.
          </p>
        </BannerPanel>
      </header>

      {/* Category Pills Filter */}
      {categories.length > 2 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="font-display text-[0.6875rem] font-extrabold uppercase tracking-wider text-muted">
            Kategori:
          </span>
          {categories.map((cat) => {
            const isActive =
              (cat === "Semua" && (!rawCategory || rawCategory === "Semua")) ||
              rawCategory.toLowerCase() === cat.toLowerCase();

            return (
              <Link
                key={cat}
                href={buildHref(1, cat)}
                className={cn(
                  "border-2 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider transition-all",
                  isActive
                    ? "border-keyline bg-lime text-ink shadow-[var(--shadow-hard-sm)]"
                    : "border-line bg-surface text-muted hover:border-keyline hover:text-foreground",
                )}
              >
                {cat}
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* Stories Semi-Grid */}
      <section aria-label="Daftar Partner Stories" className="min-h-[250px]">
        {pagedStories.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
            {pagedStories.map((story, index) => (
              <li key={story.id} className="flex">
                <PartnerCard
                  story={story}
                  index={(currentPage - 1) * PAGE_SIZE + index}
                  variant="semi-grid"
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-2 border-dashed border-line bg-surface p-10 text-center">
            <h2 className="tng-display text-xl text-foreground">
              Belum ada cerita dalam kategori ini
            </h2>
            <p className="mt-2 text-sm text-muted">
              Coba pilih kategori lain atau lihat seluruh arsip partner stories kami.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/partner">Lihat Semua Kategori</Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Pagination Controls */}
      <nav
        aria-label="Navigasi Halaman Partner Stories"
        className="mt-8 flex items-center justify-between border-t-2 border-dashed border-line pt-4"
      >
        {currentPage > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(currentPage - 1)}>
              &larr; Halaman Sebelumnya
            </Link>
          </Button>
        ) : (
          <span />
        )}

        <span className="font-display text-xs font-extrabold uppercase tracking-widest text-muted">
          Halaman {currentPage} dari {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(currentPage + 1)}>
              Halaman Berikutnya &rarr;
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>

      {/* Dedicated Advertising Callout (Directly after pagination) */}
      <div className="mt-12 sm:mt-16">
        <PartnerAdvertisingCta />
      </div>
    </Wall>
  );
}
