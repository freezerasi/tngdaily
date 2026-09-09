/**
 * Dashboard loading state. Mirrors the dashboard geometry (header, stat
 * tiles, recent list) as shimmer blocks so navigation between CMS pages feels
 * continuous instead of blank-then-pop.
 */
export default function DashboardLoading() {
  return (
    <div aria-hidden="true" className="grid gap-3">
      <div className="tng-shimmer h-12 w-1/2 border-2 border-line" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="tng-shimmer h-24 border-2 border-line"
          />
        ))}
      </div>
      <div className="grid gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="tng-shimmer h-16 border-2 border-line"
          />
        ))}
      </div>
    </div>
  );
}
