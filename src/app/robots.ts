import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The CMS and every API route stay out of the index.
        disallow: ["/admin", "/admin/", "/api/", "/cari?"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
