import type { Metadata } from "next";

import { HomeSurface } from "./home-surface";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description: SITE_DESCRIPTION,
};

export const revalidate = 300;

export default function HomePage() {
  return <HomeSurface sort="terbaru" />;
}
