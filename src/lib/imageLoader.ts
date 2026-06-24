/**
 * Custom image loader for Next.js <Image> component.
 *
 * Routes all images through /api/img which handles:
 * - Correct Referer header per source CDN
 * - Sharp resize to requested width
 * - WebP transcoding at specified quality
 *
 * This fixes Issue 1 (oversized cover images).
 */
export default function imgLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // If it's already a proxied URL, append/update width param
  if (src.startsWith("/api/img")) {
    const url = new URL(src, "http://localhost");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality || 75));
    return `${url.pathname}?${url.searchParams.toString()}`;
  }

  // Pass through non-proxied URLs (local images, etc.)
  return src;
}
