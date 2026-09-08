import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RelatedLink {
  label: string;
  href: string;
  description?: string;
}

export function RelatedPages({
  links,
  className,
}: {
  links: readonly [RelatedLink, RelatedLink, RelatedLink];
  className?: string;
}) {
  return (
    <section
      aria-label="Halaman terkait"
      className={cn("mt-8 border-t-2 border-line pt-6", className)}
    >
      <h2 className="font-display text-[0.75rem] font-black uppercase tracking-widest text-muted">
        Halaman terkait
      </h2>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col justify-between border-2 border-line bg-surface p-3.5 transition-all duration-150 hover:border-lime hover:bg-surface-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-display text-[0.875rem] font-bold text-foreground transition-colors group-hover:text-lime">
                {link.label}
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-lime"
              />
            </div>
            {link.description ? (
              <p className="mt-1.5 text-[0.75rem] leading-snug text-muted line-clamp-2">
                {link.description}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
