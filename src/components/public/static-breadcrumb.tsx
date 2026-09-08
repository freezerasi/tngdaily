import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function StaticBreadcrumb({ currentPage }: { currentPage: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 font-display text-[0.75rem] font-bold uppercase tracking-wider text-muted">
        <li>
          <Link
            href="/"
            className="transition-colors hover:text-lime"
          >
            Beranda
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3 text-muted/60" />
        </li>
        <li aria-current="page" className="text-foreground">
          {currentPage}
        </li>
      </ol>
    </nav>
  );
}
