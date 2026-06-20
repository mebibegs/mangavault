import * as cheerio from "cheerio";
import type { MangaResult } from "./scraper";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchScythePage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

export const SCYTHE_GENRE_SLUGS = [
  "action","adventure","comedy","drama","ecchi","fantasy","harem","isekai",
  "magic","martial-arts","monsters","reincarnation","return","romance",
  "supernatural","survival","time-travel","wuxia",
];

const SLUG_TO_GENRE: Record<string, string> = {
  action:"Action",adventure:"Adventure",comedy:"Comedy",drama:"Drama",
  ecchi:"Ecchi",fantasy:"Fantasy",harem:"Harem",isekai:"Isekai",
  magic:"Magic","martial-arts":"Martial Arts",monsters:"Monsters",
  reincarnation:"Reincarnation",return:"Return",romance:"Romance",
  supernatural:"Supernatural",survival:"Survival","time-travel":"Time Travel",
  wuxia:"Wuxia",
};

function parseScythePage(html: string): Array<{ title: string; img: string; href: string }> {
  const $ = cheerio.load(html);
  const cards = new Map<string, { title: string; img: string; href: string }>();

  $("a[href*='/manga/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.match(/scythescans\.com\/manga\/[a-z0-9-]+\/?$/)) return;
    if (cards.has(href)) return;

    const container = $(el).closest(".page-item-detail, .manga, article, li, div[class*='item']");
    const title = container.find("h3 a, h5 a, .post-title a").first().text().trim()
      || $(el).attr("title") || $(el).text().trim();
    const img = container.find("img").first().attr("data-src")
      || container.find("img").first().attr("src") || "";

    if (title && title.length >= 2) cards.set(href, { title, img, href });
  });

  return [...cards.values()];
}

function getMaxPage(html: string): number {
  let max = 1;
  for (const m of html.matchAll(/page\/(\d+)/g)) {
    const p = parseInt(m[1]);
    if (p > max) max = p;
  }
  return max;
}

export async function scrapeScytheGenre(slug: string): Promise<MangaResult[]> {
  const genreName = SLUG_TO_GENRE[slug] || slug;
  const html1 = await fetchScythePage(`https://scythescans.com/genres/${slug}/`);
  if (!html1) return [];

  const maxPage = getMaxPage(html1);
  let allCards = parseScythePage(html1);

  for (let p = 2; p <= maxPage; p++) {
    const html = await fetchScythePage(`https://scythescans.com/genres/${slug}/page/${p}/`);
    if (html) allCards = allCards.concat(parseScythePage(html));
  }

  return allCards.map((c) => ({
    title: c.title,
    description: "",
    rating: "N/A",
    status: "Ongoing",
    type: "Manhwa",
    genres: [genreName],
    chapters: [],
    chapterCount: "0",
    coverUrl: c.img,
    url: c.href,
    source: "Source C",
    author: "Unknown",
    artist: "Unknown",
  }));
}

export async function scrapeAllScytheGenres(): Promise<MangaResult[]> {
  const seen = new Map<string, MangaResult>();

  for (const slug of SCYTHE_GENRE_SLUGS) {
    const results = await scrapeScytheGenre(slug);
    for (const r of results) {
      const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key.length < 3) continue;
      if (!seen.has(key)) {
        seen.set(key, r);
      } else {
        const existing = seen.get(key)!;
        for (const g of r.genres) {
          if (!existing.genres.includes(g)) existing.genres.push(g);
        }
      }
    }
  }

  // Also scrape main manga listing pages
  for (let p = 1; p <= 10; p++) {
    const html = await fetchScythePage(`https://scythescans.com/manga/page/${p}/`);
    if (!html) break;
    const cards = parseScythePage(html);
    if (cards.length === 0) break;
    for (const c of cards) {
      const key = c.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key.length >= 3 && !seen.has(key)) {
        seen.set(key, {
          title: c.title, description: "", rating: "N/A", status: "Ongoing",
          type: "Manhwa", genres: [], chapters: [], chapterCount: "0",
          coverUrl: c.img, url: c.href, source: "Source C",
          author: "Unknown", artist: "Unknown",
        });
      }
    }
  }

  return [...seen.values()];
}
