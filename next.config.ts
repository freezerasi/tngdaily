import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

/**
 * Hosts the browser may load images from. Single source of truth for both the
 * next/image optimizer allowlist and the CSP `img-src` directive: article
 * bodies embed raw `<img>` tags through the Markdown sanitizer, so the CSP —
 * not next/image — is the actual enforcement for those.
 */
const IMAGE_HOSTS = [
  // Cloudinary delivers all editorial imagery after ingest.
  "res.cloudinary.com",
  // Stock providers, matching the ingest allowlist in /api/images/ingest.
  "images.unsplash.com",
  "images.pexels.com",
  "pixabay.com",
  "cdn.pixabay.com",
  // Approved community photos from the public Storage bucket share this host.
  ...(supabaseHost ? [supabaseHost] : []),
];

/**
 * Content-Security-Policy.
 *
 * A nonce-based strict CSP is deliberately NOT used: nonces require dynamic
 * rendering on every page, and this site is ISR-first by design (the proxy
 * matcher excludes public routes precisely so they stay cacheable). The
 * compromise: `script-src` keeps 'unsafe-inline' for Next's inline bootstrap
 * payload, while object/base/form/frame and `connect-src` stay locked down,
 * which removes the practical injection vectors — external scripts, plugin
 * objects, base-tag hijacks, form exfiltration, and data exfiltration via
 * fetch or websocket.
 *
 * Browser-reachable origins, verified against every client component:
 *   connect-src: /api/* ('self'), Supabase Auth (login, sign-out), and
 *               api.cloudinary.com for the signed direct upload from the
 *               image picker.
 *   img-src:     the IMAGE_HOSTS list, plus data: for inline placeholders.
 *   style-src:   the design system uses inline style attributes and sonner
 *               injects a <style> element, so 'unsafe-inline' stays.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // ISR pages cannot carry a nonce, so Next's inline bootstrap needs
  // 'unsafe-inline'. Dev adds 'unsafe-eval' for React's debug tooling.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${IMAGE_HOSTS.map((host) => `https://${host}`).join(" ")}`,
  "font-src 'self' data:",
  `connect-src 'self' https://api.cloudinary.com${
    supabaseHost ? ` https://${supabaseHost}` : ""
  }`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  // Dev serves plain http://localhost; upgrading there would break HMR.
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  images: {
    // Cloudinary handles transformation; Next only needs the remote allowlist,
    // which mirrors the CSP img-src list exactly.
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async redirects() {
    return [
      {
        source: "/tentang",
        destination: "/tentang-kami",
        permanent: true,
      },
      {
        source: "/kontribusi",
        destination: "/kirim-berita",
        permanent: true,
      },
      {
        source: "/kota",
        destination: "/suara",
        permanent: true,
      },
      {
        source: "/gaya-hidup",
        destination: "/vibes",
        permanent: true,
      },
      {
        source: "/advertorial",
        destination: "/partner",
        permanent: true,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Content-Security-Policy",
        value: contentSecurityPolicy,
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      ...(isProduction
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains; preload",
            },
          ]
        : []),
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
