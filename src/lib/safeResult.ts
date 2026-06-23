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
 * Build a proxied image URL via /api/img so the browser can load
 * images from CDNs that require specific Referer headers.
 */
function proxyImageUrl(realUrl: string): string {
  if (!realUrl || realUrl.length < 5) return "";
  // Already proxied
  if (realUrl.startsWith("/api/img") || realUrl.startsWith("/api/image")) return realUrl;
  // Only proxy external URLs
  if (!realUrl.startsWith("http")) return realUrl;
  return `/api/img?url=${encodeURIComponent(realUrl)}`;
}

/**
 * Transforms a raw result (from MongoDB or live scrape) into a safe API response.
 * - Source names are shown as readable labels (e.g. "Asura Scans")
 * - Cover images go through /api/img proxy for cross-origin loading
 * - Chapter and series URLs are passed through directly (no encryption)
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
    coverUrl: coverUrl ? proxyImageUrl(coverUrl) : "",
    url: url || "",
    source: SOURCE_NAMES[source] || source || "Unknown",
    author: (doc.author as string) || "Unknown",
    artist: (doc.artist as string) || "Unknown",
  };
}
