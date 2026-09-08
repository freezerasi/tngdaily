import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PillarPageBody,
  sanitizePillarTag,
} from "@/components/public/pillar-page-body";
import { absoluteUrl } from "@/lib/seo";
import { isPillar, PILLAR_META } from "@/types/domain";

type PillarTagParams = Promise<{ pillar: string; tag: string }>;

export const revalidate = 300;
export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: PillarTagParams;
}): Promise<Metadata> {
  const { pillar: rawPillar, tag: rawTag } = await params;
  if (!isPillar(rawPillar)) return {};

  const tag = sanitizePillarTag(rawTag);
  if (!tag) return {};

  const meta = PILLAR_META[rawPillar];
  const title = `#${tag} di ${meta.label}`;
  const description = `Kumpulan artikel TNG Daily bertag #${tag} dalam rubrik ${meta.label}, dikurasi untuk pembaca Tangerang Raya.`;
  const path = `/${rawPillar}/tag/${encodeURIComponent(tag)}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PillarTagPage({
  params,
}: {
  params: PillarTagParams;
}) {
  const { pillar, tag } = await params;
  if (!isPillar(pillar) || !sanitizePillarTag(tag)) notFound();

  return <PillarPageBody pillar={pillar} tag={tag} />;
}
