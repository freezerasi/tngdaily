import type { Metadata } from "next";

import {
  PillarPageBody,
  type PillarSearchParams,
} from "@/components/public/pillar-page-body";
import { pillarMetadata } from "@/lib/seo";

export const metadata: Metadata = pillarMetadata("suara");
export const revalidate = 300;

export default async function SuaraPage({
  searchParams,
}: {
  searchParams: Promise<PillarSearchParams>;
}) {
  return <PillarPageBody pillar="suara" searchParams={await searchParams} />;
}
