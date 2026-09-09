import { cn } from "@/lib/utils";

/**
 * CloudinaryImage: direct delivery without the Next image optimizer.
 *
 * Editorial imagery already lives on Cloudinary with transformations baked
 * into the URL (see `cloudinaryUrl` in lib/cloudinary.ts), so routing it back
 * through `/_next/image` only adds a hop, first-hit latency, and Vercel
 * transformation quota. This component renders a plain `<img>` with a
 * Cloudinary-derived `srcset` instead: zero client JavaScript, the browser
 * picks the smallest sufficient file, and non-Cloudinary URLs (stock previews,
 * community storage) degrade to a single-source image.
 *
 * Layout mirrors `next/image fill`: the parent provides a positioned box
 * (relative + aspect or fixed size) and this image fills it with `object-cover`.
 */

const CLOUDINARY_DELIVERY_HOST = "res.cloudinary.com/";
const WIDTH_SEGMENT = /\bw_\d+\b/;

const DEFAULT_WIDTHS = [640, 960, 1280];

function withWidth(src: string, width: number): string {
  return src.replace(WIDTH_SEGMENT, `w_${width}`);
}

export function CloudinaryImage({
  src,
  alt,
  sizes,
  widths = DEFAULT_WIDTHS,
  eager = false,
  className,
}: {
  src: string;
  alt: string;
  /** Same contract as the `sizes` attribute: slot width per viewport. */
  sizes: string;
  /** Candidate file widths. Keep the largest near the stored master (1600). */
  widths?: number[];
  /** Above-the-fold images only: eager load with high fetch priority. */
  eager?: boolean;
  className?: string;
}) {
  const responsive =
    src.includes(CLOUDINARY_DELIVERY_HOST) && WIDTH_SEGMENT.test(src);
  const candidates = [...widths].sort((a, b) => a - b);
  const largest = candidates[candidates.length - 1] ?? 1280;

  return (
    // Deliberate: delivery is pre-optimized Cloudinary with srcset, so the
    // Next optimizer would only add a hop and quota cost (see lib/cloudinary.ts).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={responsive ? withWidth(src, largest) : src}
      srcSet={
        responsive
          ? candidates.map((w) => `${withWidth(src, w)} ${w}w`).join(", ")
          : undefined
      }
      sizes={responsive ? sizes : undefined}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      draggable={false}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
