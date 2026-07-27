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
  "Source H": "ManhuaTop",
  "ManhuaTop": "ManhuaTop",
};

/**
 * Genre names that mark a title as 18+.
 */
export const ADULT_GENRES = [
  "Adult", "Mature", "Smut", "Ecchi", "Erotica", "Hentai",
  "Pornographic", "Doujinshi", "Yaoi", "Yuri", "Boys Love",
  "Girls Love", "Netorare", "SM BDSM",
];

const ADULT_GENRE_LOWER = ADULT_GENRES.map(g => g.toLowerCase());

/**
 * Canonical genre name mapping — normalizes inconsistent casing from sources.
 * Keys must be lowercase for matching.
 */
const GENRE_CANONICAL: Record<string, string> = {
  "slice of life": "Slice of Life",
  "sci fi": "Sci-Fi",
  "sci-fi": "Sci-Fi",
  "martial arts": "Martial Arts",
  "school life": "School Life",
  "school": "School",
  "full color": "Full Color",
  "graphic novel": "Graphic Novel",
  "boys love": "Boys Love",
  "girls love": "Girls Love",
  "tragedy": "Tragedy",
  "historical": "Historical",
  "medical": "Medical",
  "murim": "Murim",
  "revenge": "Revenge",
  "isekai": "Isekai",
  "shoujo ai": "Shoujo Ai",
  "shounen ai": "Shounen Ai",
};

/**
 * Normalize genre name to consistent casing.
 * Also splits concatenated genres like "DRAMARomance" → "DRAMA", "Romance".
 */
function normalizeGenre(genre: string): string {
  const lower = genre.toLowerCase().trim();
  return GENRE_CANONICAL[lower] || genre;
}

/**
 * Split concatenated genre strings that some sources produce.
 * "DRAMARomance" → ["DRAMA", "Romance"]
 * "ActionFantasy" → ["Action", "Fantasy"]
 */
function splitConcatenatedGenres(genres: string[]): string[] {
  const result: string[] = [];
  for (const g of genres) {
    // Split on lowercase→uppercase transitions (e.g., "DRAMARomance" → "DRAMA", "Romance")
    const split = g.replace(/([a-z])([A-Z])/g, "$1|||$2").split("|||");
    for (const part of split) {
      const normalized = normalizeGenre(part.trim());
      if (normalized && !result.includes(normalized)) {
        result.push(normalized);
      }
    }
  }
  return result;
}

/**
 * Fix common title casing issues from scraped data.
 * - Apostrophe followed by uppercase letter → lowercase (What'S → What's)
 * - Em dash used as placeholder → "—"  (already correct)
 */
function normalizeTitle(title: string): string {
  if (!title) return title;
  return title
    // Fix apostrophe + uppercase: What'S → What's, God'S → God's
    .replace(/([a-zA-Z])'([A-Z])/g, (_match, before: string, after: string) => `${before}'${after.toLowerCase()}`)
    // Fix double-space from missing word boundaries
    .replace(/\s{2,}/g, " ");
}

/**
 * Strip markdown image syntax and other markup from description text.
 * Prevents raw ![alt](url) from leaking into the page.
 */
function stripMarkdownImages(text: string): string {
  if (!text) return text;
  return text
    // Remove markdown images: ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // Remove leftover markdown links: [text](url)
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    // Clean up extra whitespace
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Check if a result contains adult/18+ genres.
 */
export function isAdultContent(genres: string[]): boolean {
  return genres.some(g => ADULT_GENRE_LOWER.includes(g.toLowerCase()));
}

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
  const sources = (doc.sources as Array<{ name: string; url: string }>) || [];

  return {
    title: normalizeTitle(title),
    description: stripMarkdownImages((doc.description as string) || ""),
    rating: (doc.rating as string) || "N/A",
    status: (doc.status as string) || "Unknown",
    type: (doc.type as string) || "Manhwa",
    genres: splitConcatenatedGenres((doc.genres as string[]) || []),
    chapters: chapters.map((ch) => ({
      title: ch.title,
      url: ch.url || "",
      date: ch.date || "",
    })),
    chapterCount: (doc.chapterCount as string) || "0",
    coverUrl: coverUrl ? proxyImageUrl(coverUrl) : "",
    url: url || "",
    source: SOURCE_NAMES[source] || source || "Unknown",
    sources: sources.map((s) => ({
      name: SOURCE_NAMES[s.name] || s.name || "Unknown",
      url: s.url || "",
    })),
    author: (doc.author as string) || "Unknown",
    artist: (doc.artist as string) || "Unknown",
  };
}
