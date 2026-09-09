/**
 * Public loading state. Shimmer blocks in the page's own geometry — never a
 * spinner — so the skeleton hands off to real content without layout shift.
 * Only visible while a dynamic page renders or a static page revalidates;
 * ISR hits never reach it.
 */
export default function PublicLoading() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-7xl px-3 sm:px-4">
      <div className="tng-shimmer mt-3 h-8 w-2/3 border-2 border-line" />
      <div className="tng-shimmer mt-3 aspect-[16/9] w-full border-2 border-keyline" />
      <div className="mt-3 grid gap-2">
        <div className="tng-shimmer h-5 w-11/12 border-2 border-line" />
        <div className="tng-shimmer h-5 w-3/4 border-2 border-line" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="tng-shimmer aspect-[16/9] w-full border-2 border-line"
          />
        ))}
      </div>
    </div>
  );
}
