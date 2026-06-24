/**
 * Source code → human-readable name mapping
 */
const SOURCE_NAMES: Record<string, string> = {
  "Source A": "Asura Scans",
  "Source B": "Demonic Scans",
  "Source C": "Scythe Scans",
  "Source D": "Webtoons",
  "Source E": "Manganato",
  "Source F": "Atsu",
  "Source G": "Omega Scans",
};

/**
 * Build an optimized image URL through our own /api/img proxy.
 *
 * The proxy:
 *   1. Adds the correct Referer header so CDNs don't 403
 *   2. When `w` is provided, uses Sharp to resize + transcode to WebP
 *
 * Cover images are displayed at ~300 px so we request w=400 (2x retina).
 * This turns an 8 MB JPEG into a ~50 KB WebP.
 */
function proxyImageUrl(realUrl: string, width?: number): string {
  if (!realUrl || realUrl.length < 5) return "";
  // Already proxied
  if (realUrl.startsWith("/api/")) return realUrl;
  // Only proxy external URLs
  if (!realUrl.startsWith("http")) return realUrl;

  const params = new URLSearchParams({ url: realUrl });
  if (width && width > 0) {
    params.set("w", String(width));
    params.set("q", "80");
  }
  return `/api/img?${params.toString()}`;
}

/**
 * Transforms a raw result (from MongoDB or live scrape) into a safe API response.
 * - Source names are shown as readable labels (e.g. "Asura Scans")
 * - Cover images go through /api/img proxy with resize (400px WebP)
 * - Chapter and series URLs are passed through directly
 */
export function toSafeResult(doc: Record<string, unknown>) {
  const coverUrl = (doc.coverUrl as string) || "";
  const source = (doc.source as string) || "";
  const url = (doc.url as string) || "";
  const title = (doc.title as string) || "";
  const chapters = (doc.chapters as Array<{ title: string; url: string; date: string }>) || [];

  return {
    title,
    description: (doc.description as string) || "",
    rating: (doc.rating as string) || "N/A",
    status: (doc.status as string) || "Unknown",
    type: (doc.type as string) || "Manhwa",
    genres: (doc.genres as string[]) || [],
    chapters: chapters.map((ch) => ({
      title: ch.title,
      url: ch.url || "",
      date: ch.date || "",
    })),
    chapterCount: (doc.chapterCount as string) || "0",
    // Covers: proxy + resize to 400px + WebP
    coverUrl: coverUrl ? proxyImageUrl(coverUrl, 400) : "",
    url: url || "",
    source: SOURCE_NAMES[source] || source || "Unknown",
    author: (doc.author as string) || "Unknown",
    artist: (doc.artist as string) || "Unknown",
  };
}
