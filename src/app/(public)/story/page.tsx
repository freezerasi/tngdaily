import type { Metadata } from "next";

import { PillarPageBody } from "@/components/public/pillar-page-body";
import { pillarMetadata } from "@/lib/seo";

export const metadata: Metadata = pillarMetadata("story");
export const revalidate = 300;

export default function StoryPage() {
  return <PillarPageBody pillar="story" />;
}
