import Link from "next/link";
import { format } from "date-fns";
// Deep import: the locale barrel would bundle every language (see dates.ts).
import { id as localeId } from "date-fns/locale/id";

import type { CityWeather } from "@/lib/data/pulse";

/**
 * PulseBar: the utility strip above the masthead.
 *
 * Everything here is a fact we can stand behind. Weather is a live Open-Meteo
 * reading; the date is the date. There is no traffic status, no reader count,
 * and no event listing, because we have no source for any of them and a news
 * site does not invent them.
 *
 * Mobile keeps only the pulse label and the date: at 360px the utility links
 * would wrap the strip to two lines and push the masthead down, and both links
 * already exist in the masthead and the bottom nav.
 */
export function PulseBar({
  weather,
}: {
  weather: CityWeather | null;
}) {
  const today = new Date();
  const longDate = format(today, "EEEE, dd MMM", { locale: localeId }).toUpperCase();
  const shortDate = format(today, "dd MMM", { locale: localeId }).toUpperCase();

  return (
    <div className="border-b border-line bg-wall-deep text-foreground">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-2 overflow-hidden px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex size-2 shrink-0">
            <span
              aria-hidden="true"
              className="absolute inline-flex size-full rounded-full bg-lime opacity-75 motion-safe:animate-[tng-pulse_2.4s_var(--ease-tack)_infinite]"
            />
            <span className="relative inline-flex size-2 rounded-full bg-lime" />
          </span>

          {/* Full label from sm; the word "PULSE" alone below that, so the strip
              never wraps to two lines on a 360px phone. */}
          <span className="tng-label whitespace-nowrap text-[0.625rem] tracking-[0.14em] text-foreground">
            <span className="hidden sm:inline">TANGERANG PULSE</span>
            <span className="sm:hidden">TNG PULSE</span>
          </span>

          {weather ? (
            <span className="flex min-w-0 items-center gap-1.5 text-[0.625rem] text-muted">
              <span aria-hidden="true" className="text-line">
                &bull;
              </span>
              <span className="tabular-nums text-foreground">
                {weather.temperatureC}&deg;C
              </span>
              <span className="hidden truncate sm:inline">{weather.condition}</span>
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[0.625rem] sm:gap-3">
          <Link
            href="/kirim-berita"
            className="tng-label hidden tracking-wider text-muted transition-colors hover:text-lime sm:inline"
          >
            KIRIM BERITA
          </Link>
          <span aria-hidden="true" className="hidden text-line sm:inline">
            |
          </span>
          <Link
            href="/cari"
            className="tng-label hidden tracking-wider text-muted transition-colors hover:text-lime sm:inline"
          >
            ARSIP
          </Link>
          <span aria-hidden="true" className="hidden text-line sm:inline">
            |
          </span>
          <time
            dateTime={today.toISOString()}
            className="tng-label whitespace-nowrap font-bold tracking-wider text-muted"
          >
            <span className="hidden sm:inline">{longDate}</span>
            <span className="sm:hidden">{shortDate}</span>
          </time>
        </div>
      </div>

      {weather ? (
        // Open-Meteo's licence requires attribution. Present for readers using a
        // screen reader and for crawlers, without cluttering a 36px strip.
        <span className="sr-only">
          Data cuaca dari Open-Meteo, diperbarui setiap 15 menit.
        </span>
      ) : null}
    </div>
  );
}
