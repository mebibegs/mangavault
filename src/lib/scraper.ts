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

const TIMEOUT_MS = 15000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Connection: "keep-alive",
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

// ════════════════════════════════════════════════════════════════════
// SOURCE 1: ASURA SCANS
// ════════════════════════════════════════════════════════════════════

async function searchSource1(query: string): Promise<MangaResult[]> {
  try {
    const searchUrl = `https://asurascans.com/browse?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(searchUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

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

    const results: MangaResult[] = [];
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

async function getTrendingSource1(): Promise<MangaResult[]> {
  try {
    const res = await fetchWithTimeout("https://asurascans.com/browse?sort=rating");
    const html = await res.text();
    const $ = cheerio.load(html);

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

    const results: MangaResult[] = [];
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

function parseSource1Detail(html: string, url: string, fallbackTitle: string): MangaResult | null {
  try {
    const $ = cheerio.load(html);

    const pageTitle = $("title").text().trim().replace(/\s*[\|–—-]\s*Asura\s*Scans?.*/i, "").trim();
    
    let title = pageTitle || "";
    let description = "";
    let rating = "N/A";
    let status = "Unknown";
    let type = "Manhwa";
    let author = "Unknown";
    let artist = "Unknown";
    let coverUrl = "";
    let chapterCount = "0";
    const genres: string[] = [];
    const chapters: ChapterInfo[] = [];

    // Parse astro-island props
    $("astro-island").each((_, el) => {
      const props = $(el).attr("props");
      if (props && props.includes('"description"')) {
        try {
          const titleMatch = props.match(/"title":\[0,"([^"]+)"\]/);
          if (titleMatch && !title) title = titleMatch[1];

          const ratingMatch = props.match(/"rating":\[0,([\d.]+)\]/);
          if (ratingMatch) rating = parseFloat(ratingMatch[1]).toFixed(1);

          const statusMatch = props.match(/"status":\[0,"([^"]+)"\]/);
          if (statusMatch) status = statusMatch[1];

          const typeMatch = props.match(/"type":\[0,"([^"]+)"\]/);
          if (typeMatch) type = typeMatch[1];

          const authorMatch = props.match(/"author":\[0,"([^"]+)"\]/);
          if (authorMatch) author = authorMatch[1];

          const artistMatch = props.match(/"artist":\[0,"([^"]+)"\]/);
          if (artistMatch) artist = artistMatch[1];

          const coverMatch = props.match(/"coverUrl":\[0,"([^"]+)"\]/);
          if (coverMatch) coverUrl = coverMatch[1];

          const chCountMatch = props.match(/"chapterCount":\[0,(\d+)\]/);
          if (chCountMatch) chapterCount = chCountMatch[1];

          const EXCLUDED = new Set(["home", "bookmarks", "browse", "search", "login", "register", "latest", "popular"]);
          const genreMatches = props.matchAll(/"name":\[0,"([^"]+)"\]/g);
          for (const m of genreMatches) {
            if (!genres.includes(m[1]) && !EXCLUDED.has(m[1].toLowerCase())) genres.push(m[1]);
          }

          const descMatch = props.match(/"description":\[0,"<p>([\s\S]*?)<\/p>"\]/);
          if (descMatch) {
            description = descMatch[1].replace(/\\"/g, '"').replace(/&nbsp;/g, " ").replace(/&#160;/g, " ").trim();
          }
        } catch { /* ignore */ }
      }
    });

    if (!description) {
      const descEl = $("div p").first();
      if (descEl.length) description = descEl.text().trim().substring(0, 500);
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

// ════════════════════════════════════════════════════════════════════
// SOURCE 2: DEMONIC SCANS - FIXED
// ════════════════════════════════════════════════════════════════════

async function searchSource2(query: string): Promise<MangaResult[]> {
  try {
    // Try the homepage and filter by query
    const res = await fetchWithTimeout("https://demonicscans.org/");
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: { title: string; href: string }[] = [];
    const queryLower = query.toLowerCase();

    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      if (
        href &&
        title &&
        title.length > 2 &&
        !href.includes("/manga/page/") &&
        title.toLowerCase().includes(queryLower) &&
        !links.find((l) => l.href === href)
      ) {
        links.push({
          title,
          href: href.startsWith("http") ? href : `https://demonicscans.org${href}`,
        });
      }
    });

    // Also try direct URL
    const slug = query.trim().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("-");
    const directUrl = `https://demonicscans.org/manga/${slug}`;
    if (!links.find(l => l.href === directUrl)) {
      links.push({ title: query, href: directUrl });
    }

    const results: MangaResult[] = [];
    const detailPromises = links.slice(0, 8).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        if (!detailRes.ok) return null;
        const detailHtml = await detailRes.text();
        return parseSource2Detail(detailHtml, link.href);
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

    const results: MangaResult[] = [];
    const detailPromises = links.slice(0, 10).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        if (!detailRes.ok) return null;
        const detailHtml = await detailRes.text();
        return parseSource2Detail(detailHtml, link.href);
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

function parseSource2Detail(html: string, url: string): MangaResult | null {
  try {
    const $ = cheerio.load(html);

    // Title from <title> tag
    const title = $("title").text().trim();
    if (!title || title.length === 0) return null;

    // Cover image from og:image meta tag
    const coverUrl = $('meta[property="og:image"]').attr("content") || 
                     $('meta[name="image"]').attr("content") ||
                     $("#manga-page img").attr("src") || "";

    // Rating from the RVB element (e.g., "9.45")
    let rating = "N/A";
    $(".RVB").each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/^(\d+\.?\d*)$/);
      if (match && parseFloat(match[1]) <= 10) {
        rating = match[1];
      }
    });

    // Description - parse from page content
    let description = "";
    const bodyText = $("body").text();
    const summaryMatch = bodyText.match(/The Summary is\s*([\s\S]*?)(?:\n\n|You must|$)/i);
    if (summaryMatch) {
      description = summaryMatch[1].replace(/\s+/g, " ").trim();
    }
    if (!description) {
      // Try og:description
      description = $('meta[property="og:description"]').attr("content") || "";
    }

    // Type detection from page text
    let type = "Manhwa";
    const pageText = $("body").text().toLowerCase();
    if (pageText.includes("manhua")) type = "Manhua";
    else if (pageText.includes("manga")) type = "Manga";

    // Chapters
    const chapters: ChapterInfo[] = [];
    $("a[href*='chaptered.php'], a[href*='/chapter']").each((_, el) => {
      const chTitle = $(el).text().replace(/\s+/g, " ").trim();
      const chUrl = $(el).attr("href") || "";
      if (chTitle && chUrl && (chTitle.toLowerCase().includes("chapter") || chTitle.toLowerCase().includes("read"))) {
        chapters.push({
          title: chTitle,
          url: chUrl.startsWith("http") ? chUrl : `https://demonicscans.org${chUrl}`,
          date: "",
        });
      }
    });

    return {
      title,
      description: description || "No description available.",
      rating,
      status: "Ongoing",
      type,
      genres: [],
      chapters: chapters.slice(0, 30),
      chapterCount: String(chapters.length),
      coverUrl,
      url,
      source: "Source B",
      author: "Unknown",
      artist: "Unknown",
    };
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// SOURCE 3: SCYTHE SCANS - FIXED (Madara WordPress Theme)
// ════════════════════════════════════════════════════════════════════

async function searchSource3(query: string): Promise<MangaResult[]> {
  try {
    const searchUrl = `https://scythescans.com/?s=${encodeURIComponent(query)}&post_type=wp-manga`;
    const res = await fetchWithTimeout(searchUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: { title: string; href: string }[] = [];

    // Search results - find manga links
    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).find("h3, h4, .post-title").text().trim() || $(el).text().trim();
      if (
        href &&
        href.includes("/manga/") &&
        !href.includes("/manga/page/") &&
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

    // If no results, try direct URL
    if (links.length === 0) {
      const slug = query.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      links.push({ title: query, href: `https://scythescans.com/manga/${slug}/` });
    }

    const results: MangaResult[] = [];
    const detailPromises = links.slice(0, 8).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        if (!detailRes.ok) return null;
        const detailHtml = await detailRes.text();
        return parseSource3Detail(detailHtml, link.href);
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

    const links: { title: string; href: string }[] = [];

    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href");
      // Try to find title from various places
      let title = $(el).find(".post-title, h3, h4, h5").text().trim();
      if (!title) title = $(el).attr("title") || "";
      if (!title) title = $(el).text().trim();
      
      if (
        href &&
        href.includes("/manga/") &&
        !href.includes("/manga/page/") &&
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

    const results: MangaResult[] = [];
    const detailPromises = links.slice(0, 10).map(async (link) => {
      try {
        const detailRes = await fetchWithTimeout(link.href);
        if (!detailRes.ok) return null;
        const detailHtml = await detailRes.text();
        return parseSource3Detail(detailHtml, link.href);
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

function parseSource3Detail(html: string, url: string): MangaResult | null {
  try {
    const $ = cheerio.load(html);

    // Title from <title> or og:title
    let title = $('meta[property="og:title"]').attr("content") || "";
    title = title.replace(/\s*-\s*Scythe\s*Scans.*/i, "").trim();
    if (!title) title = $("title").text().replace(/\s*-\s*Scythe\s*Scans.*/i, "").trim();
    if (!title || title.length === 0) return null;

    // Cover from og:image
    const coverUrl = $('meta[property="og:image"]').attr("content") || "";

    // Description from og:description or meta description
    let description = $('meta[property="og:description"]').attr("content") || "";
    if (!description || description.includes("Scythe Scans")) {
      description = $('meta[name="description"]').attr("content") || "";
    }
    // Clean up generic descriptions
    if (description.includes("Read your favorite manga")) {
      description = "";
    }
    
    // Try to get description from page content
    if (!description) {
      $(".summary__content p, .description-summary p, .manga-excerpt p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && !description) {
          description = text;
        }
      });
    }

    // Get rating from post-total-rating or score element
    let rating = "N/A";
    const ratingEl = $(".post-total-rating .score, .total_votes, .rating-count");
    if (ratingEl.length) {
      const rText = ratingEl.text().trim();
      const rMatch = rText.match(/(\d+\.?\d*)/);
      if (rMatch && parseFloat(rMatch[1]) <= 10) {
        rating = rMatch[1];
      }
    }

    // Status, type, author, artist from post-content_item
    let status = "Ongoing";
    let type = "Manhwa";
    let author = "Unknown";
    let artist = "Unknown";
    const genres: string[] = [];

    $(".post-content_item").each((_, el) => {
      const label = $(el).find(".summary-heading h5, .summary-heading").text().toLowerCase().trim();
      const value = $(el).find(".summary-content, .artist-content").text().trim();
      if (label.includes("status")) status = value || status;
      if (label.includes("type")) type = value || type;
      if (label.includes("author")) author = value || author;
      if (label.includes("artist")) artist = value || artist;
    });

    // Genres
    $(".genres-content a, .tags-content a").each((_, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) genres.push(g);
    });

    // Chapters
    const chapters: ChapterInfo[] = [];
    $("li.wp-manga-chapter a, .version-chap a, ul.main a").each((_, el) => {
      const chTitle = $(el).text().trim();
      const chUrl = $(el).attr("href") || "";
      const dateEl = $(el).closest("li").find(".chapter-release-date, span.chapter-time, i");
      const date = dateEl.text().trim();
      if (chTitle && chUrl) {
        chapters.push({
          title: chTitle,
          url: chUrl.startsWith("http") ? chUrl : `https://scythescans.com${chUrl}`,
          date,
        });
      }
    });

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

// ════════════════════════════════════════════════════════════════════
// RELEVANCE CHECK
// ════════════════════════════════════════════════════════════════════

function isRelevant(result: MangaResult, query: string): boolean {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const qWords = q.split(/\s+/).filter(w => w.length > 1);
  const titleLower = result.title.toLowerCase();
  const descLower = result.description.toLowerCase();

  const SKIP_TITLES = ["manga lists", "latest updates", "popular", "home", "search", "scythe scans", "demonic scans"];
  if (SKIP_TITLES.some(s => titleLower === s || titleLower.includes(s))) return false;

  const matchCount = qWords.filter(w => titleLower.includes(w) || descLower.includes(w)).length;
  return matchCount >= Math.max(1, Math.floor(qWords.length * 0.5));
}

// ════════════════════════════════════════════════════════════════════
// MAIN SEARCH (PARALLEL)
// ════════════════════════════════════════════════════════════════════

export async function searchAllSources(query: string): Promise<MangaResult[]> {
  const [r1, r2, r3] = await Promise.allSettled([
    searchSource1(query),
    searchSource2(query),
    searchSource3(query),
  ]);

  const results: MangaResult[] = [];

  if (r1.status === "fulfilled") results.push(...r1.value);
  if (r2.status === "fulfilled") results.push(...r2.value);
  if (r3.status === "fulfilled") results.push(...r3.value);

  // Filter relevance
  const relevant = results.filter(r => isRelevant(r, query));

  // Deduplicate
  const seen = new Set<string>();
  const unique: MangaResult[] = [];
  for (const r of relevant) {
    const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!seen.has(key) && key.length > 2) {
      seen.add(key);
      unique.push(r);
    }
  }

  return unique;
}

// ════════════════════════════════════════════════════════════════════
// GET TRENDING (FOR HOMEPAGE)
// ════════════════════════════════════════════════════════════════════

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

  // Filter out garbage
  const valid = results.filter(r => 
    r.title && 
    r.title.length > 2 && 
    !["manga lists", "latest updates", "home", "search", "scythe scans", "demonic scans"].some(s => 
      r.title.toLowerCase().includes(s)
    )
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

  return unique.slice(0, 30);
}
