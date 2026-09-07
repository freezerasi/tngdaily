import { RowSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat dashboard</span>
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <RowSkeleton rows={5} />
    </div>
  );
}
