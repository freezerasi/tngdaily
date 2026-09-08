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
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const weather = await getCityWeather();

  return (
    <div className="flex min-h-dvh flex-col">
      <PulseBar weather={weather} />
      <TopBar />
      <main id="konten" className="flex-1 pb-20 lg:pb-8">
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
