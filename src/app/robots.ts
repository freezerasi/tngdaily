import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

const PUBLIC_DISALLOWS = ["/admin", "/admin/", "/api/", "/cari?"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The CMS, APIs, and internal search result URLs stay out of indexes.
        disallow: PUBLIC_DISALLOWS,
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "DuckDuckBot",
          "Applebot",
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Claude-User",
          "anthropic-ai",
        ],
        allow: "/",
        disallow: PUBLIC_DISALLOWS,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
