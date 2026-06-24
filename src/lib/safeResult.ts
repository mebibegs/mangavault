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
 * Build a proxy URL for our /api/img endpoint.
 *
 * The proxy handles:
 *   1. Correct Referer header so CDNs don't 403
 *   2. When w/q params are provided by Next.js <Image> loader,
 *      Sharp resizes + transcodes to WebP
 *
 * We intentionally do NOT bake in w/q here — the Next.js Image component's
 * custom loader appends the correct width from its `sizes` prop.
 */
function proxyImageUrl(realUrl: string): string {
  if (!realUrl || realUrl.length < 5) return "";
  if (realUrl.startsWith("/api/")) return realUrl;
  if (!realUrl.startsWith("http")) return realUrl;
  return `/api/img?url=${encodeURIComponent(realUrl)}`;
}

/**
 * Transforms a raw result into a safe API response.
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
