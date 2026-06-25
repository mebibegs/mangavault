/**
 * Custom image loader for Next.js <Image> component.
 *
 * All cover images are pre-proxied via safeResult.ts as /api/img?url=...
 * This loader adds/updates the w= and q= params so Sharp resizes to the
 * exact width the browser needs — fixing the w=3840 oversized image bug.
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
  // Already a proxied URL — update w/q while keeping the url= param intact
  if (src.startsWith("/api/img")) {
    const u = new URL(src, "http://localhost");
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", String(quality ?? 75));
    return `${u.pathname}?${u.searchParams.toString()}`;
  }

  // External http(s) URL — wrap it in the proxy
  if (src.startsWith("http")) {
    return `/api/img?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
  }

  // Local/static assets — return as-is
  return src;
}
