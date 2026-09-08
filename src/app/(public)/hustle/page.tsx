import type { Metadata } from "next";

import { PillarPageBody } from "@/components/public/pillar-page-body";
import { pillarMetadata } from "@/lib/seo";

export const metadata: Metadata = pillarMetadata("hustle");
export const revalidate = 300;

export default function HustlePage() {
  return <PillarPageBody pillar="hustle" />;
}
