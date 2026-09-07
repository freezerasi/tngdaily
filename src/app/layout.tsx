import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";

import "@/app/globals.css";
import { defaultMetadata } from "@/lib/seo";
import { Toaster } from "@/components/ui/toaster";

/**
 * Bricolage Grotesque carries display type: a variable grotesk with a width
 * axis, so headlines can be genuinely condensed instead of transform-squashed.
 * Manrope handles body copy.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
  axes: ["opsz", "wdth"],
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = defaultMetadata();

export const viewport: Viewport = {
  themeColor: "#0B0D0E",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${bricolage.variable} ${manrope.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#konten"
          className="tng-label sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-100 focus-visible:border-2 focus-visible:border-keyline focus-visible:bg-lime focus-visible:px-3 focus-visible:py-2 focus-visible:text-ink"
        >
          Lompat ke konten
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
