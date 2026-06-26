import type { MangaResult } from "./scraper";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface OmegaSeries {
  title: string;
  series_slug: string;
  description: string;
  thumbnail: string;
  rating: number;
  status: string;
  alternative_names: string;
  tags: Array<{ id: number; name: string }>;
  meta: { chapters_count: string };
}

interface OmegaResponse {
  data: OmegaSeries[];
  meta: { total: number; last_page: number; per_page: number };
}

/**
 * Genres that are adult-only and should only appear on the adult page.
 * Everything else is considered safe-for-work and appears on the normal genres page.
 */
export const OMEGA_ADULT_GENRES = new Set([
  "adult",
  "doujinshi",
  "ecchi",
  "erotica",
  "hentai",
  "mature",
  "netorare",
  "pornographic",
  "smut",
  "sm_bdsm",
  "bdsm",
  "yuri",
  "yaoi",
  "boys love",
  "office workers",  // listed alongside adult content on OmegaScans
  "full color",      // OmegaScans full-color is almost exclusively adult
]);

/** All genres shown on the adult genre filter UI */
export const ADULT_GENRE_LIST = [
  "All",
  "Action",
  "Adult",
  "Boys Love",
  "Comedy",
  "Doujinshi",
  "Drama",
  "Ecchi",
  "Erotica",
  "Fantasy",
  "Full Color",
  "Harem",
  "Hentai",
  "Isekai",
  "Mature",
  "Netorare",
  "Office Workers",
  "Pornographic",
  "Romance",
  "Slice of Life",
  "SM BDSM",
  "Smut",
  "Supernatural",
  "Yaoi",
  "Yuri",
];

/** Genres safe for the normal /genres page (non-adult Omega content excluded here) */
export const OMEGA_SAFE_GENRES = new Set([
  "action",
  "adaptation",
  "adventure",
  "childhood friends",
  "comedy",
  "demons",
  "drama",
  "fantasy",
  "gender bender",
  "heartwarming",
  "historical",
  "isekai",
  "josei",
  "long strip",
  "magic",
  "manga",
  "manhua",
  "manhwa",
  "martial arts",
  "mecha",
  "monsters",
  "mystery",
  "one shot",
  "psychological",
  "reincarnation",
  "revenge",
  "romance",
  "school life",
  "shoujo",
  "shounen",
  "slice of life",
  "super power",
  "supernatural",
  "survival",
  "time travel",
  "tragedy",
  "transmigration",
  "vampires",
  "villainess",
  "webtoons",
]);

function cleanDescription(raw: string): string {
  return (raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toMangaResult(s: OmegaSeries): MangaResult {
  const genres = (s.tags || []).map((t) => t.name).filter(Boolean);
  const description = cleanDescription(s.description);
  return {
    title: s.title,
    description: description || "No description available.",
    rating: s.rating ? String(s.rating) : "N/A",
    status: s.status || "Ongoing",
    type: "Manhwa",
    genres,
    chapters: [],
    chapterCount: String(s.meta?.chapters_count || 0),
    coverUrl: s.thumbnail || "",
    url: `https://omegascans.org/series/${s.series_slug}`,
    source: "Omega Scans",
    author: "Unknown",
    artist: "Unknown",
  };
}

/**
 * Returns true if a series has at least one adult genre tag.
 * Used to route it to /adult instead of /genres.
 */
export function isAdultSeries(genres: string[]): boolean {
  return genres.some((g) => OMEGA_ADULT_GENRES.has(g.toLowerCase()));
}

/**
 * Fetch ALL OmegaScans titles (adult=true to get everything),
 * then split into adult vs safe-for-work by genre.
 */
export async function scrapeAllOmegaTitles(): Promise<MangaResult[]> {
  const results: MangaResult[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= 20; page++) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: "100",
        series_type: "Comic",
        query_string: "",
        orderBy: "created_at",
        adult: "true",
        order: "desc",
        status: "All",
        tags_ids: "[]",
      });

      const res = await fetch(`https://api.omegascans.org/query?${params}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (!res.ok) break;

      const data: OmegaResponse = await res.json();
      if (!data.data || data.data.length === 0) break;

      for (const s of data.data) {
        const key = s.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length < 3 || seen.has(key)) continue;
        seen.add(key);
        results.push(toMangaResult(s));
      }

      if (page >= data.meta.last_page) break;
    } catch {
      break;
    }
  }

  return results;
}

/**
 * Fetch only adult-tagged OmegaScans titles for the /adult page.
 * Filters to series that have at least one adult genre.
 */
export async function scrapeAdultOmegaTitles(): Promise<MangaResult[]> {
  const all = await scrapeAllOmegaTitles();
  return all.filter((r) => isAdultSeries(r.genres));
}

/**
 * Fetch only SFW OmegaScans titles for the normal /genres page.
 * Excludes series with any adult genre tag.
 */
export async function scrapeSafeOmegaTitles(): Promise<MangaResult[]> {
  const all = await scrapeAllOmegaTitles();
  return all.filter((r) => !isAdultSeries(r.genres));
}

/** Search OmegaScans — returns all results; caller decides adult vs safe */
export async function searchOmega(query: string): Promise<MangaResult[]> {
  try {
    const params = new URLSearchParams({
      page: "1",
      perPage: "20",
      series_type: "Comic",
      query_string: query,
      orderBy: "created_at",
      adult: "true",
      order: "desc",
      status: "All",
      tags_ids: "[]",
    });

    const res = await fetch(`https://api.omegascans.org/query?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return [];

    const data: OmegaResponse = await res.json();
    return (data.data || []).map(toMangaResult);
  } catch {
    return [];
  }
}

/** Search OmegaScans restricted to adult-tagged titles */
export async function searchAdultOmega(query: string): Promise<MangaResult[]> {
  const results = await searchOmega(query);
  return results.filter((r) => isAdultSeries(r.genres));
}
