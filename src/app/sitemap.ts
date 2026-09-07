import type { MetadataRoute } from "next";

import { getPublishedSlugs } from "@/lib/data/articles";
import { absoluteUrl } from "@/lib/seo";
import { PILLARS } from "@/types/domain";

export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getPublishedSlugs();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/tentang"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/kontribusi"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const pillarRoutes: MetadataRoute.Sitemap = PILLARS.map((pillar) => ({
    url: absoluteUrl(`/${pillar}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const articleRoutes: MetadataRoute.Sitemap = slugs.map((entry) => ({
    url: absoluteUrl(`/artikel/${entry.slug}`),
    lastModified: new Date(entry.updatedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...pillarRoutes, ...articleRoutes];
}
