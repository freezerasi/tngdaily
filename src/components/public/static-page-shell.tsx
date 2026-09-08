import * as React from "react";
import { Wall } from "@/components/shared/banner-panel";
import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { StaticBreadcrumb } from "@/components/public/static-breadcrumb";
import { EditorialCta } from "@/components/public/editorial-cta";
import { RelatedPages, type RelatedLink } from "@/components/public/related-pages";
import { cn } from "@/lib/utils";

interface StaticPageShellProps {
  breadcrumbTitle: string;
  badgeText?: string;
  title: string;
  subtitle?: string;
  headerInk?: "wall" | "bone" | "orange" | "lime" | "deep";
  children: React.ReactNode;
  showEditorialCta?: boolean;
  relatedLinks: readonly [RelatedLink, RelatedLink, RelatedLink];
  jsonLd?: Record<string, unknown>;
  className?: string;
}

export function StaticPageShell({
  breadcrumbTitle,
  badgeText = "Editorial",
  title,
  subtitle,
  headerInk = "bone",
  children,
  showEditorialCta = false,
  relatedLinks,
  jsonLd,
  className,
}: StaticPageShellProps) {
  return (
    <Wall
      rail={false}
      className={cn("mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-8 break-words", className)}
    >
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <StaticBreadcrumb currentPage={breadcrumbTitle} />

      <header className="mb-6">
        <BannerPanel
          ink={headerInk}
          lift="lg"
          grommets
          className="p-5 sm:p-7 md:p-8"
        >
          <TapePatch tone={headerInk === "bone" ? "wall" : "lime"} tilt="left">
            {badgeText}
          </TapePatch>
          <h1
            className={cn(
              "tng-display mt-4 text-[2.25rem] sm:text-[3.25rem] md:text-[3.75rem] leading-[0.9] tracking-tight break-words",
              headerInk === "bone" ? "text-ink" : "text-foreground",
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={cn(
                "tng-measure mt-4 text-[0.9375rem] sm:text-[1rem] leading-relaxed break-words",
                headerInk === "bone" ? "text-ink/80" : "text-muted",
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </BannerPanel>
      </header>

      <div className="space-y-6 text-foreground break-words">
        {children}
      </div>

      {showEditorialCta ? <EditorialCta /> : null}

      <RelatedPages links={relatedLinks} />
    </Wall>
  );
}
