import * as cheerio from "cheerio";

export interface MangaResult {
  title: string;
  description: string;
  rating: string;
  status: string;
  type: string;
  genres: string[];
  chapters: ChapterInfo[];
  chapterCount: string;
  coverUrl: string;
  url: string;
  source: string;
  author: string;
  artist: string;
}

export interface ChapterInfo {
  title: string;
  url: string;
  date: string;
}

const TIMEOUT_MS = 12000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Cache-Control": "no-cache",
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...HEADERS, ...((options.headers as Record<string, string>) || {}) },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Source 1: Asura Scans ───
async function searchSource1(query: string): Promise<MangaResult[]> {
  try {
    const searchUrl = `https://asurascans.com/browse?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(searchUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: MangaResult[] = [];
    const links: { title: string; href: string }[] = [];

    $("a[href*='/comics/']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).find("h3").text().trim() || $(el).text().trim();
      if (href && title && title.length > 0 && !links.find((l) => l.href === href)) {
        links.push({
          title,
          href: href.startsWith("http") ? href : `https://asurascans.com${href}`,
        });
      }
    });

    const detailPromises = links.slice(0, 8).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        const detailHtml = await detailRes.text();
        return parseSource1Detail(detailHtml, link.href, link.title);
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);
    for (const d of details) {
      if (d) results.push(d);
    }

    return results;
  } catch (err) {
    console.error("Source 1 search error:", err);
    return [];
  }
}

// Fetch trending/popular from Source 1
async function getTrendingSource1(): Promise<MangaResult[]> {
  try {
    const res = await fetchWithTimeout("https://asurascans.com/browse?sort=rating");
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: MangaResult[] = [];
    const links: { title: string; href: string }[] = [];

    $("a[href*='/comics/']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).find("h3").text().trim();
      if (href && title && title.length > 0 && !links.find((l) => l.href === href)) {
        links.push({
          title,
          href: href.startsWith("http") ? href : `https://asurascans.com${href}`,
        });
      }
    });

    const detailPromises = links.slice(0, 12).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        const detailHtml = await detailRes.text();
        return parseSource1Detail(detailHtml, link.href, link.title);
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);
    for (const d of details) {
      if (d) results.push(d);
    }

    return results;
  } catch (err) {
    console.error("Source 1 trending error:", err);
    return [];
  }
}

function parseSource1Detail(
  html: string,
  url: string,
  fallbackTitle: string
): MangaResult | null {
  try {
    const $ = cheerio.load(html);

    const pageTitle = $("title").text().trim().replace(/\s*[\|–—-]\s*Asura\s*Scans?.*/i, "").trim();
    
    let title = pageTitle || "";
    let description = "";
    let rating = "N/A";
    let status = "Unknown";
    let type = "Unknown";
    let author = "Unknown";
    let artist = "Unknown";
    let coverUrl = "";
    let chapterCount = "0";
    const genres: string[] = [];
    const chapters: ChapterInfo[] = [];

    $("astro-island").each((_, el) => {
      const props = $(el).attr("props");
      if (props) {
        try {
          const propsStr = props;

          if (propsStr.includes('"description"')) {
            const titleMatch = propsStr.match(/"title":\[0,"([^"]+)"\]/);
            if (titleMatch && !title) title = titleMatch[1];
          }

          const ratingMatch = propsStr.match(/"rating":\[0,([\d.]+)\]/);
          if (ratingMatch) rating = parseFloat(ratingMatch[1]).toFixed(1);

          const statusMatch = propsStr.match(/"status":\[0,"([^"]+)"\]/);
          if (statusMatch) status = statusMatch[1];

          const typeMatch = propsStr.match(/"type":\[0,"([^"]+)"\]/);
          if (typeMatch) type = typeMatch[1];

          const authorMatch = propsStr.match(/"author":\[0,"([^"]+)"\]/);
          if (authorMatch) author = authorMatch[1];

          const artistMatch = propsStr.match(/"artist":\[0,"([^"]+)"\]/);
          if (artistMatch) artist = artistMatch[1];

          const coverMatch = propsStr.match(/"coverUrl":\[0,"([^"]+)"\]/);
          if (coverMatch) coverUrl = coverMatch[1];

          const chCountMatch = propsStr.match(/"chapterCount":\[0,(\d+)\]/);
          if (chCountMatch) chapterCount = chCountMatch[1];

          const EXCLUDED_GENRES = new Set(["home", "bookmarks", "browse", "search", "login", "register", "latest", "popular"]);
          const genreMatches = propsStr.matchAll(/"name":\[0,"([^"]+)"\]/g);
          for (const m of genreMatches) {
            if (!genres.includes(m[1]) && !EXCLUDED_GENRES.has(m[1].toLowerCase())) genres.push(m[1]);
          }

          const descMatch = propsStr.match(
            /"description":\[0,"<p>([\s\S]*?)<\/p>"\]/
          );
          if (descMatch) {
            description = descMatch[1]
              .replace(/\\"/g, '"')
              .replace(/&nbsp;/g, " ")
              .replace(/&#160;/g, " ")
              .trim();
          }
        } catch {
          // Silent fail
        }
      }
    });

    if (!description) {
      const descEl = $("div p").first();
      if (descEl.length) {
        description = descEl.text().trim().substring(0, 500);
      }
    }

    $("a[href*='/chapter-']").each((_, el) => {
      const chTitle = $(el).text().replace(/\s+/g, " ").trim();
      const chUrl = $(el).attr("href") || "";
      if (chTitle && chTitle.length > 0) {
        chapters.push({
          title: chTitle,
          url: chUrl.startsWith("http") ? chUrl : `https://asurascans.com${chUrl}`,
          date: "",
        });
      }
    });

    if (!title) title = fallbackTitle;
    if (!title || title.length === 0) return null;

    return {
      title,
      description: description || "No description available.",
      rating,
      status: status.charAt(0).toUpperCase() + status.slice(1),
      type: type.charAt(0).toUpperCase() + type.slice(1),
      genres,
      chapters: chapters.slice(0, 30),
      chapterCount: chapterCount || String(chapters.length),
      coverUrl,
      url,
      source: "Source A",
      author,
      artist,
    };
  } catch {
    return null;
  }
}

// ─── Source 2: Demonic Scans ───
async function searchSource2(query: string): Promise<MangaResult[]> {
  try {
    const searchUrl = `https://demonicscans.org/search?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(searchUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: MangaResult[] = [];
    const links: { title: string; href: string }[] = [];

    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      if (
        href &&
        title &&
        title.length > 1 &&
        !href.includes("/manga/page/") &&
        !links.find((l) => l.href === href)
      ) {
        links.push({
          title,
          href: href.startsWith("http") ? href : `https://demonicscans.org${href}`,
        });
      }
    });

    if (links.length === 0) {
      const slug = query
        .trim()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join("-");
      const directUrl = `https://demonicscans.org/manga/${slug}`;
      try {
        const directRes = await fetchWithTimeout(directUrl);
        if (directRes.ok) {
          links.push({ title: query, href: directUrl });
        }
      } catch {
        // ignore
      }
    }

    const detailPromises = links.slice(0, 8).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        const detailHtml = await detailRes.text();
        return parseSource2Detail(detailHtml, link.href, link.title);
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);
    for (const d of details) {
      if (d) results.push(d);
    }

    return results;
  } catch (err) {
    console.error("Source 2 search error:", err);
    return [];
  }
}

async function getTrendingSource2(): Promise<MangaResult[]> {
  try {
    const res = await fetchWithTimeout("https://demonicscans.org/");
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: MangaResult[] = [];
    const links: { title: string; href: string }[] = [];

    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      if (
        href &&
        title &&
        title.length > 2 &&
        !href.includes("/manga/page/") &&
        !links.find((l) => l.href === href)
      ) {
        links.push({
          title,
          href: href.startsWith("http") ? href : `https://demonicscans.org${href}`,
        });
      }
    });

    const detailPromises = links.slice(0, 10).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        const detailHtml = await detailRes.text();
        return parseSource2Detail(detailHtml, link.href, link.title);
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);
    for (const d of details) {
      if (d) results.push(d);
    }

    return results;
  } catch (err) {
    console.error("Source 2 trending error:", err);
    return [];
  }
}

function parseSource2Detail(
  html: string,
  url: string,
  fallbackTitle: string
): MangaResult | null {
  try {
    const $ = cheerio.load(html);

    const title =
      $("h1").first().text().trim() ||
      $(".entry-title").text().trim() ||
      fallbackTitle;

    let description = "";
    const summaryEl = $(".summary__content p, .description-summary p, .manga-excerpt p");
    if (summaryEl.length) {
      description = summaryEl
        .map((_, el) => $(el).text().trim())
        .get()
        .join(" ");
    }
    if (!description) {
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes("Summary is") || text.length > 100) {
          const cleaned = text.replace(/.*Summary is\s*/i, "").trim();
          if (cleaned.length > description.length) description = cleaned;
        }
      });
    }

    let rating = "N/A";
    const ratingEl = $(".rating, .score, .num, [class*='rating']");
    if (ratingEl.length) {
      const rText = ratingEl.first().text().trim();
      if (rText && !isNaN(parseFloat(rText))) {
        rating = rText;
      }
    }

    let status = "Unknown";
    let type = "Manhwa";
    let author = "Unknown";
    let artist = "Unknown";
    const genres: string[] = [];

    $(".genres-content a, .genre a, a[href*='genre']").each((_, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) genres.push(g);
    });

    $("div.post-content_item, .post-content_item").each((_, el) => {
      const label = $(el).find("h5, .summary-heading").text().toLowerCase().trim();
      const value = $(el).find(".summary-content, .artist-content").text().trim();
      if (label.includes("status")) status = value || status;
      if (label.includes("type")) type = value || type;
      if (label.includes("author")) author = value || author;
      if (label.includes("artist")) artist = value || artist;
    });

    const chapters: ChapterInfo[] = [];
    $("a[href*='/chapter'], li.wp-manga-chapter a, .chapter-link a").each(
      (_, el) => {
        const rawTitle = $(el).text().replace(/\s+/g, " ").trim();
        const titleDateMatch = rawTitle.match(/^(Chapter\s+[\d.]+)\s+([\d-]+)$/);
        const chTitle = titleDateMatch ? titleDateMatch[1] : rawTitle;
        const inlineDate = titleDateMatch ? titleDateMatch[2] : "";
        const chUrl = $(el).attr("href") || "";
        const dateEl = $(el).parent().find(".chapter-release-date, .release-date, time");
        const date = dateEl.text().trim() || inlineDate;
        if (chTitle && chTitle.length > 0) {
          chapters.push({
            title: chTitle,
            url: chUrl.startsWith("http")
              ? chUrl
              : `https://demonicscans.org${chUrl}`,
            date,
          });
        }
      }
    );

    const coverUrl =
      $(".summary_image img, .thumb img, img.wp-post-image").attr("src") || "";

    if (!title || title.length === 0) return null;

    return {
      title,
      description: description || "No description available.",
      rating,
      status,
      type,
      genres,
      chapters: chapters.slice(0, 30),
      chapterCount: String(chapters.length),
      coverUrl,
      url,
      source: "Source B",
      author,
      artist,
    };
  } catch {
    return null;
  }
}

// ─── Source 3: Scythe Scans ───
async function searchSource3(query: string): Promise<MangaResult[]> {
  try {
    const searchUrl = `https://scythescans.com/?s=${encodeURIComponent(query)}&post_type=wp-manga`;
    const res = await fetchWithTimeout(searchUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: MangaResult[] = [];
    const links: { title: string; href: string }[] = [];

    $(
      ".c-tabs-item__content a, .post-title a, h3 a, h4 a, .item-thumb a, a[href*='/manga/']"
    ).each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      if (
        href &&
        href.includes("/manga/") &&
        title &&
        title.length > 1 &&
        !links.find((l) => l.href === href)
      ) {
        links.push({
          title,
          href: href.startsWith("http") ? href : `https://scythescans.com${href}`,
        });
      }
    });

    if (links.length === 0) {
      const slug = query.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const directUrl = `https://scythescans.com/manga/${slug}/`;
      try {
        const directRes = await fetchWithTimeout(directUrl);
        if (directRes.ok) {
          links.push({ title: query, href: directUrl });
        }
      } catch {
        // ignore
      }
    }

    const detailPromises = links.slice(0, 8).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        if (!detailRes.ok) return null;
        const detailHtml = await detailRes.text();
        return parseSource3Detail(detailHtml, link.href, link.title);
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);
    for (const d of details) {
      if (d) results.push(d);
    }

    return results;
  } catch (err) {
    console.error("Source 3 search error:", err);
    return [];
  }
}

async function getTrendingSource3(): Promise<MangaResult[]> {
  try {
    const res = await fetchWithTimeout("https://scythescans.com/");
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: MangaResult[] = [];
    const links: { title: string; href: string }[] = [];

    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).find(".post-title, h3, h4").text().trim() || $(el).text().trim();
      if (
        href &&
        href.includes("/manga/") &&
        title &&
        title.length > 2 &&
        !links.find((l) => l.href === href)
      ) {
        links.push({
          title,
          href: href.startsWith("http") ? href : `https://scythescans.com${href}`,
        });
      }
    });

    const detailPromises = links.slice(0, 10).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        if (!detailRes.ok) return null;
        const detailHtml = await detailRes.text();
        return parseSource3Detail(detailHtml, link.href, link.title);
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);
    for (const d of details) {
      if (d) results.push(d);
    }

    return results;
  } catch (err) {
    console.error("Source 3 trending error:", err);
    return [];
  }
}

function parseSource3Detail(
  html: string,
  url: string,
  fallbackTitle: string
): MangaResult | null {
  try {
    const $ = cheerio.load(html);

    const title =
      $(".post-title h1").text().trim() ||
      $("h1").first().text().trim() ||
      fallbackTitle;

    let description = "";
    $(
      ".summary__content p, .description-summary .summary__content p, .manga-excerpt p, .entry-content p"
    ).each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 10) description += (description ? " " : "") + t;
    });

    if (!description) {
      $("p").each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 80 && !description) description = t;
      });
    }

    let rating = "N/A";
    const ratingEl = $(
      ".post-total-rating .score, .total_votes, .post-total-rating .num"
    );
    if (ratingEl.length) {
      const r = ratingEl.text().trim();
      if (r && !isNaN(parseFloat(r))) rating = r;
    }

    let status = "Unknown";
    let type = "Manhwa";
    let author = "Unknown";
    let artist = "Unknown";
    const genres: string[] = [];

    $(".post-content_item, .post-content .post-content_item").each((_, el) => {
      const label = $(el)
        .find(".summary-heading h5, .summary-heading")
        .text()
        .toLowerCase()
        .trim();
      const value = $(el).find(".summary-content, .artist-content").text().trim();
      if (label.includes("status")) status = value || status;
      if (label.includes("type")) type = value || type;
      if (label.includes("author")) author = value || author;
      if (label.includes("artist")) artist = value || artist;
    });

    $(".genres-content a, .tags-content a").each((_, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) genres.push(g);
    });

    const chapters: ChapterInfo[] = [];
    $("li.wp-manga-chapter a, .version-chap a, ul.main a").each((_, el) => {
      const chTitle = $(el).text().trim();
      const chUrl = $(el).attr("href") || "";
      const dateEl = $(el)
        .closest("li")
        .find(".chapter-release-date i, .chapter-release-date, span.chapter-time");
      const date = dateEl.text().trim();
      if (chTitle && chTitle.length > 0 && chUrl.includes("chapter")) {
        chapters.push({
          title: chTitle,
          url: chUrl.startsWith("http")
            ? chUrl
            : `https://scythescans.com${chUrl}`,
          date,
        });
      }
    });

    const coverUrl =
      $(".summary_image img").attr("data-src") ||
      $(".summary_image img").attr("src") ||
      $("img.wp-post-image").attr("src") ||
      "";

    if (!title || title.length === 0) return null;

    return {
      title,
      description: description || "No description available.",
      rating,
      status,
      type,
      genres,
      chapters: chapters.slice(0, 30),
      chapterCount: String(chapters.length),
      coverUrl,
      url,
      source: "Source C",
      author,
      artist,
    };
  } catch {
    return null;
  }
}

// Check if result is relevant
function isRelevant(result: MangaResult, query: string): boolean {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const qWords = q.split(/\s+/).filter(w => w.length > 1);
  const titleLower = result.title.toLowerCase();
  const descLower = result.description.toLowerCase();

  const SKIP_TITLES = ["manga lists", "latest updates", "popular", "home", "search"];
  if (SKIP_TITLES.some(s => titleLower === s)) return false;

  const matchCount = qWords.filter(w => titleLower.includes(w) || descLower.includes(w)).length;
  return matchCount >= Math.max(1, Math.floor(qWords.length * 0.5));
}

// ─── Main search (parallel) ───
export async function searchAllSources(
  query: string
): Promise<MangaResult[]> {
  const [r1, r2, r3] = await Promise.allSettled([
    searchSource1(query),
    searchSource2(query),
    searchSource3(query),
  ]);

  const results: MangaResult[] = [];

  if (r1.status === "fulfilled") results.push(...r1.value);
  if (r2.status === "fulfilled") results.push(...r2.value);
  if (r3.status === "fulfilled") results.push(...r3.value);

  const relevant = results.filter(r => isRelevant(r, query));

  const seen = new Set<string>();
  const unique: MangaResult[] = [];
  for (const r of relevant) {
    const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  return unique;
}

// ─── Get trending/featured (for homepage) ───
export async function getTrendingAll(): Promise<MangaResult[]> {
  const [r1, r2, r3] = await Promise.allSettled([
    getTrendingSource1(),
    getTrendingSource2(),
    getTrendingSource3(),
  ]);

  const results: MangaResult[] = [];

  if (r1.status === "fulfilled") results.push(...r1.value);
  if (r2.status === "fulfilled") results.push(...r2.value);
  if (r3.status === "fulfilled") results.push(...r3.value);

  // Filter out bad entries
  const valid = results.filter(r => 
    r.title && 
    r.title.length > 2 && 
    !["manga lists", "latest updates", "home", "search"].includes(r.title.toLowerCase())
  );

  // Deduplicate
  const seen = new Set<string>();
  const unique: MangaResult[] = [];
  for (const r of valid) {
    const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!seen.has(key) && key.length > 2) {
      seen.add(key);
      unique.push(r);
    }
  }

  // Shuffle for variety
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  return unique.slice(0, 30); // Return up to 30 items
}
