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
  tags: Array<{ name: string }>;
  meta: { chapters_count: string };
}

interface OmegaResponse {
  data: OmegaSeries[];
  meta: { total: number; last_page: number; per_page: number };
}

/**
 * Fetch all OmegaScans titles via their public JSON API.
 * API: https://api.omegascans.org/query?page=N&perPage=100
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

        const genres = (s.tags || []).map((t) => t.name).filter(Boolean);
        const description = (s.description || "")
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;|&#160;/g, " ")
          .replace(/&amp;/g, "&")
          .trim();

        results.push({
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
        });
      }

      if (page >= data.meta.last_page) break;
    } catch {
      break;
    }
  }

  return results;
}

/** Search OmegaScans via their API */
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
    return (data.data || []).map((s) => ({
      title: s.title,
      description: (s.description || "").replace(/<[^>]*>/g, "").trim(),
      rating: s.rating ? String(s.rating) : "N/A",
      status: s.status || "Ongoing",
      type: "Manhwa",
      genres: (s.tags || []).map((t) => t.name).filter(Boolean),
      chapters: [],
      chapterCount: String(s.meta?.chapters_count || 0),
      coverUrl: s.thumbnail || "",
      url: `https://omegascans.org/series/${s.series_slug}`,
      source: "Omega Scans",
      author: "Unknown",
      artist: "Unknown",
    }));
  } catch {
    return [];
  }
}
