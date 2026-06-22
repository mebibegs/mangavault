import { buildProxiedImageUrl, encryptSourceRef, encryptImageUrl } from "./crypto";

/**
 * Encrypt a chapter/series URL so the real domain is hidden from the client.
 * The reader endpoint will decrypt it to fetch the actual page.
 */
function encryptUrl(url: string): string {
  if (!url) return "";
  try {
    return `enc_${encryptImageUrl(url)}`;
  } catch {
    return "";
  }
}

/**
 * Transforms a raw result (from MongoDB or live scrape) into a safe API response
 * where all source CDN URLs are proxied through encrypted tokens and
 * source identifiers are encrypted.
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
      url: encryptUrl(ch.url),
      date: ch.date,
    })),
    chapterCount: (doc.chapterCount as string) || "0",
    coverUrl: coverUrl ? buildProxiedImageUrl(coverUrl) : "",
    url: encryptUrl(url),
    source: source ? `src_${encryptSourceRef(source, url).substring(0, 8)}` : "",
    author: (doc.author as string) || "Unknown",
    artist: (doc.artist as string) || "Unknown",
  };
}
