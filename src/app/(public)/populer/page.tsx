import type { Metadata } from "next";

import { HomeSurface } from "../home-surface";

const title = "Trending Tangerang";
const description =
  "Artikel TNG Daily yang paling ramai dibaca, dari kuliner, isu kota, loker, sampai cerita warga Tangerang Raya.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/populer" },
  openGraph: {
    type: "website",
    title,
    description,
    url: "/populer",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const revalidate = 300;

export default function PopularPage() {
  return <HomeSurface sort="populer" />;
}
