import * as cheerio from "cheerio";
import type { MangaResult } from "./scraper";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function webtoonCookies(): string {
  return [
    `ageGateV2=${Date.now()}`,
    "needGDPR=N","needCCPA=N","needCOPPA=N","pagGDPR=true",
    "contentRating=adult","locale=en","country=US","timezoneOffset=-300",
  ].join("; ");
}

async function fetchWebtoonPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Cookie: webtoonCookies(),
        Referer: "https://www.webtoons.com/",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** All Webtoons genre slugs */
export const WEBTOON_GENRE_SLUGS = [
  "action","comedy","drama","fantasy","horror","mystery",
  "romance","sf","thriller","supernatural","sports",
  "slice-of-life","historical","heartwarming","super-hero",
  "graphic-novel","tiptoon",
];

/** Map Webtoons genre slug → display genre name */
const SLUG_TO_GENRE: Record<string, string> = {
  action: "Action", comedy: "Comedy", drama: "Drama",
  fantasy: "Fantasy", horror: "Horror", mystery: "Mystery",
  romance: "Romance", sf: "Sci-Fi", thriller: "Thriller",
  supernatural: "Supernatural", sports: "Sports",
  "slice-of-life": "Slice of Life", historical: "Historical",
  heartwarming: "Heartwarming", "super-hero": "Superhero",
  "graphic-novel": "Graphic Novel", tiptoon: "Tiptoon",
};

/**
 * Scrape one Webtoons genre page and extract all title cards.
 * Each page returns up to ~900 cards with title, cover, author, genre.
 */
export async function scrapeWebtoonGenre(genreSlug: string): Promise<MangaResult[]> {
  // The sortOrder=MANA gives us the most popular first
  // NOTE: some slugs use different URL format
  const url = `https://www.webtoons.com/en/genres/${genreSlug}?sortOrder=MANA`;
  const html = await fetchWebtoonPage(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const results: MangaResult[] = [];
  const seen = new Set<string>();
  const genreName = SLUG_TO_GENRE[genreSlug] || genreSlug;

  $("a[href*='/list?title_no=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.includes("/list?title_no=")) return;

    const titleNo = $(el).attr("data-title-no") || "";
    if (seen.has(titleNo || href)) return;
    seen.add(titleNo || href);

    const title = $(el).find("strong.title, .subj").text().trim()
      || $(el).attr("title") || "";
    if (!title || title.length < 2) return;

    const img = $(el).find("img");
    const coverUrl = img.attr("src") || img.attr("data-src") || "";

    const author = $(el).find(".author, .author_area").text().trim() || "Unknown";

    // Extract data-genre attribute or use the page genre
    const dataGenre = $(el).attr("data-genre") || "";
    const genres: string[] = [genreName];
    if (dataGenre && dataGenre !== genreName.toUpperCase()) {
      const mapped = SLUG_TO_GENRE[dataGenre.toLowerCase()];
      if (mapped && !genres.includes(mapped)) genres.push(mapped);
    }

    const fullUrl = href.startsWith("http") ? href : `https://www.webtoons.com${href}`;

    results.push({
      title,
      description: "",
      rating: "N/A",
      status: "Ongoing",
      type: "Webtoon",
      genres,
      chapters: [],
      chapterCount: "0",
      coverUrl,
      url: fullUrl,
      source: "Webtoons",
      author,
      artist: author,
    });
  });

  return results;
}

/**
 * Scrape ALL Webtoons genre pages and return combined results.
 * This gives us thousands of titles across all genres.
 */
export async function scrapeAllWebtoonGenres(): Promise<MangaResult[]> {
  const allResults: MangaResult[] = [];
  const seen = new Set<string>();

  // Process genres in batches of 3 to avoid overwhelming the server
  for (let i = 0; i < WEBTOON_GENRE_SLUGS.length; i += 3) {
    const batch = WEBTOON_GENRE_SLUGS.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map(slug => scrapeWebtoonGenre(slug))
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const title of r.value) {
        const key = title.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length > 2 && !seen.has(key)) {
          seen.add(key);
          allResults.push(title);
        } else if (seen.has(key)) {
          // Merge genres for duplicate titles
          const existing = allResults.find(
            t => t.title.toLowerCase().replace(/[^a-z0-9]/g, "") === key
          );
          if (existing) {
            for (const g of title.genres) {
              if (!existing.genres.includes(g)) existing.genres.push(g);
            }
          }
        }
      }
    }
  }

  return allResults;
}

/**
 * Scrape a single Webtoons genre by slug name.
 * Convenience wrapper that accepts display names like "Romance", "Sci-Fi", etc.
 */
export async function scrapeWebtoonGenreByName(genreName: string): Promise<MangaResult[]> {
  const lower = genreName.toLowerCase().replace(/[^a-z]/g, "");

  // Find matching slug
  for (const [slug, name] of Object.entries(SLUG_TO_GENRE)) {
    if (name.toLowerCase().replace(/[^a-z]/g, "") === lower) {
      return scrapeWebtoonGenre(slug);
    }
  }

  // Try slug directly
  if (WEBTOON_GENRE_SLUGS.includes(genreName.toLowerCase())) {
    return scrapeWebtoonGenre(genreName.toLowerCase());
  }

  return [];
}
