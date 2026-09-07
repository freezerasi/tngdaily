import type { Metadata } from "next";

import {
  PillarPageBody,
  type PillarSearchParams,
} from "@/components/public/pillar-page-body";
import { pillarMetadata } from "@/lib/seo";

export const metadata: Metadata = pillarMetadata("vibes");
export const revalidate = 300;

export default async function VibesPage({
  searchParams,
}: {
  searchParams: Promise<PillarSearchParams>;
}) {
  return <PillarPageBody pillar="vibes" searchParams={await searchParams} />;
}
