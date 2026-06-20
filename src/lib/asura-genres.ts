import * as cheerio from "cheerio";
import type { MangaResult } from "./scraper";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchAsuraPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

/** All Asura genre slugs */
export const ASURA_GENRE_SLUGS = [
  "action","adventure","comedy","crazy-mc","demon","drama","dungeons",
  "fantasy","game","genius-mc","isekai","kuchikuchi","magic","martial-arts",
  "murim","mystery","necromancer","overpowered","regression","reincarnation",
  "revenge","romance","school-life","sci-fi","shoujo","shounen","system",
  "tower","tragedy","villain","violence",
];

/** Map slug → display name */
const SLUG_TO_GENRE: Record<string, string> = {
  "action":"Action","adventure":"Adventure","comedy":"Comedy","crazy-mc":"Crazy MC",
  "demon":"Demon","drama":"Drama","dungeons":"Dungeons","fantasy":"Fantasy",
  "game":"Game","genius-mc":"Genius MC","isekai":"Isekai","kuchikuchi":"Kuchikuchi",
  "magic":"Magic","martial-arts":"Martial Arts","murim":"Murim","mystery":"Mystery",
  "necromancer":"Necromancer","overpowered":"Overpowered","regression":"Regression",
  "reincarnation":"Reincarnation","revenge":"Revenge","romance":"Romance",
  "school-life":"School Life","sci-fi":"Sci-fi","shoujo":"Shoujo","shounen":"Shounen",
  "system":"System","tower":"Tower","tragedy":"Tragedy","villain":"Villain",
  "violence":"Violence",
};

function parseAsuraGenrePage(html: string, genreName: string): MangaResult[] {
  const $ = cheerio.load(html);
  const cards = new Map<string, { title: string; img: string; href: string }>();

  $("a[href*='/comics/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.includes("/comics/")) return;

    if (!cards.has(href)) cards.set(href, { href, title: "", img: "" });
    const card = cards.get(href)!;

    const h3 = $(el).find("h3").text().trim();
    if (h3) card.title = h3;

    const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
    if (img && !card.img) card.img = img;
  });

  const results: MangaResult[] = [];
  for (const [, card] of cards) {
    if (!card.title || card.title.length < 2) continue;
    const fullUrl = card.href.startsWith("http")
      ? card.href
      : `https://asurascans.com${card.href}`;

    results.push({
      title: card.title,
      description: "",
      rating: "N/A",
      status: "Ongoing",
      type: "Manhwa",
      genres: [genreName],
      chapters: [],
      chapterCount: "0",
      coverUrl: card.img,
      url: fullUrl,
      source: "Source A",
      author: "Unknown",
      artist: "Unknown",
    });
  }

  return results;
}

function getMaxPage(html: string): number {
  let max = 1;
  for (const m of html.matchAll(/page=(\d+)/g)) {
    const p = parseInt(m[1]);
    if (p > max) max = p;
  }
  return max;
}

/**
 * Scrape one Asura genre across all its paginated pages.
 */
export async function scrapeAsuraGenre(slug: string): Promise<MangaResult[]> {
  const genreName = SLUG_TO_GENRE[slug] || slug;
  const firstPage = await fetchAsuraPage(`https://asurascans.com/browse?genres=${slug}&page=1`);
  if (!firstPage) return [];

  const maxPage = getMaxPage(firstPage);
  const allResults = parseAsuraGenrePage(firstPage, genreName);

  if (maxPage > 1) {
    const pages = Array.from({ length: maxPage - 1 }, (_, i) => i + 2);
    // Fetch remaining pages in batches of 3
    for (let i = 0; i < pages.length; i += 3) {
      const batch = pages.slice(i, i + 3);
      const htmls = await Promise.allSettled(
        batch.map((p) => fetchAsuraPage(`https://asurascans.com/browse?genres=${slug}&page=${p}`))
      );
      for (const r of htmls) {
        if (r.status === "fulfilled" && r.value) {
          allResults.push(...parseAsuraGenrePage(r.value, genreName));
        }
      }
    }
  }

  return allResults;
}

/**
 * Scrape ALL Asura genres and return combined deduplicated results.
 */
export async function scrapeAllAsuraGenres(): Promise<MangaResult[]> {
  const allResults: MangaResult[] = [];
  const seen = new Map<string, MangaResult>();

  for (let i = 0; i < ASURA_GENRE_SLUGS.length; i += 3) {
    const batch = ASURA_GENRE_SLUGS.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((slug) => scrapeAsuraGenre(slug))
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const title of r.value) {
        const key = title.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length < 3) continue;
        if (!seen.has(key)) {
          seen.set(key, title);
        } else {
          // Merge genres
          const existing = seen.get(key)!;
          for (const g of title.genres) {
            if (!existing.genres.includes(g)) existing.genres.push(g);
          }
        }
      }
    }
  }

  return [...seen.values()];
}
