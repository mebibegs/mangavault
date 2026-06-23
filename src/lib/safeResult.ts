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
 * Build an optimized image URL using wsrv.nl (free image CDN).
 * This service handles:
 * - Resizing to specified dimensions
 * - Converting to WebP format (smaller file size)
 * - Proper caching
 * 
 * For cover images displayed at ~300px width, we resize to 400px
 * to account for high-DPI displays while keeping file size small.
 */
function optimizeImageUrl(realUrl: string, width = 400): string {
  if (!realUrl || realUrl.length < 5) return "";
  
  // Skip if already optimized or is a data URL
  if (realUrl.startsWith("data:")) return realUrl;
  if (realUrl.includes("wsrv.nl")) return realUrl;
  
  // Use wsrv.nl for image optimization (free, no signup)
  // - w: width (height auto-calculated to maintain aspect ratio)
  // - output: webp for smaller file size
  // - fit: cover for proper cropping
  // - q: quality (80 is good balance of quality/size)
  const params = new URLSearchParams({
    url: realUrl,
    w: String(width),
    output: "webp",
    q: "80",
    fit: "cover",
  });
  
  return `https://wsrv.nl/?${params.toString()}`;
}

/**
 * Transforms a raw result (from MongoDB or live scrape) into a safe API response.
 * - Source names are shown as readable labels (e.g. "Asura Scans")
 * - Cover images are optimized via wsrv.nl (resized to 400px, WebP format)
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
    // Optimize cover images: resize to 400px width, convert to WebP
    coverUrl: coverUrl ? optimizeImageUrl(coverUrl, 400) : "",
    url: url || "",
    source: SOURCE_NAMES[source] || source || "Unknown",
    author: (doc.author as string) || "Unknown",
    artist: (doc.artist as string) || "Unknown",
  };
}

/**
 * Get a higher resolution optimized image URL for detail views
 */
export function getHighResImageUrl(realUrl: string): string {
  if (!realUrl || realUrl.length < 5) return "";
  return optimizeImageUrl(realUrl, 600);
}
