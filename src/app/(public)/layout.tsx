import { Suspense } from "react";

import { BottomNav } from "@/components/public/bottom-nav";
import { TopBar } from "@/components/public/top-bar";
import { PulseBar } from "@/components/layout/pulse-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCityWeather } from "@/lib/data/pulse";

/**
 * Public shell.
 *
 * Order matters: the pulse strip scrolls away, the masthead is sticky, and the
 * filter bar (rendered per page) sticks under it. Only 56px of chrome stays
 * pinned on a phone, which keeps the viewport for content.
 *
 * Weather resolves inside Suspense on purpose: it is a live third-party fetch
 * and must never delay the shell, the content, or the first byte. The fallback
 * is the same strip without the weather segment, so there is no layout shift
 * when the real strip streams in.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<PulseBar weather={null} />}>
        <PulseStrip />
      </Suspense>
      <TopBar />
      <main id="konten" className="flex-1 pb-20 lg:pb-8">
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}

async function PulseStrip() {
  const weather = await getCityWeather();
  return <PulseBar weather={weather} />;
}
