import { BottomNav } from "@/components/public/bottom-nav";
import { TopBar } from "@/components/public/top-bar";
import { PulseBar } from "@/components/layout/pulse-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCityWeather, getNewsroomPulse } from "@/lib/data/pulse";

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
  // Both are cached server reads; neither blocks on the other.
  const [weather, newsroom] = await Promise.all([
    getCityWeather(),
    getNewsroomPulse(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <PulseBar weather={weather} newsroom={newsroom} />
      <TopBar />
      <main id="konten" className="flex-1 pb-20 lg:pb-8">
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
