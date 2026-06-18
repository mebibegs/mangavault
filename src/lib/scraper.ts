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

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...HEADERS, ...((options.headers as Record<string, string>) || {}) },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSafe(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function splitChapterTitleAndDate(raw: string): { title: string; date: string } {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const datePatterns = [
    // Absolute dates
    /(.*?)(\b\d{4}-\d{2}-\d{2}\b)\s*$/,                                    // 2027-06-13
    /(.*?)(\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)\s*$/,                           // 06/13/2027
    /(.*?)(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b)\s*$/i,  // Jun 13, 2027
    // Relative dates
    /(.*?)(\b\d+\s*(?:second|sec|s)\s*ago\b)\s*$/i,
    /(.*?)(\b\d+\s*(?:minute|min|m)\s*ago\b)\s*$/i,
    /(.*?)(\b\d+\s*(?:hour|hr|h)\s*ago\b)\s*$/i,
    /(.*?)(\b\d+\s*(?:day|d)\s*ago\b)\s*$/i,
    /(.*?)(\b\d+\s*(?:week|w)\s*ago\b)\s*$/i,
    /(.*?)(\b\d+\s*(?:month|mo)\s*ago\b)\s*$/i,
    /(.*?)(\b\d+\s*(?:year|yr|y)\s*ago\b)\s*$/i,
    // Shorthand relative: "5d" "3h" "10m" at end of string
    /(.*?)\s+(\d+[smhdwymo])\s*$/i,
    // Yesterday / today / just now
    /(.*?)(\byesterday\b)\s*$/i,
    /(.*?)(\btoday\b)\s*$/i,
    /(.*?)(\bjust now\b)\s*$/i,
    // "N days/hours" without "ago"
    /(.*?)(\b\d+\s*(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b)\s*$/i,
  ];

  for (const pattern of datePatterns) {
    const match = cleaned.match(pattern);
    if (match && match[1].trim().length > 0) {
      return { title: match[1].trim(), date: match[2].trim() };
    }
  }

  return { title: cleaned, date: "" };
}

function dedupeChapters(chapters: ChapterInfo[]): ChapterInfo[] {
  const seenUrls = new Set<string>();
  const result: ChapterInfo[] = [];
  for (const ch of chapters) {
    const key = ch.url.trim();
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      result.push(ch);
    }
  }
  return result;
}



// ════════════════════════════════════════════════════════════════════
// SOURCE 1: ASURA SCANS
// ════════════════════════════════════════════════════════════════════

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

    $("astro-island").each((_, el) => {
      const props = $(el).attr("props");
      if (props && props.includes('"description"')) {
        try {
          const m = (p: string) => { const r = props.match(new RegExp(`"${p}":\\[0,"([^"]+)"\\]`)); return r ? r[1] : null; };
          if (!title) title = m("title") || "";
          const r = props.match(/"rating":\[0,([\d.]+)\]/);
          if (r) rating = parseFloat(r[1]).toFixed(1);
          status = m("status") || status;
          type = m("type") || type;
          author = m("author") || author;
          artist = m("artist") || artist;
          coverUrl = m("coverUrl") || coverUrl;
          const cc = props.match(/"chapterCount":\[0,(\d+)\]/);
          if (cc) chapterCount = cc[1];
          const EX = new Set(["home","bookmarks","browse","search","login","register","latest","popular"]);
          for (const gm of props.matchAll(/"name":\[0,"([^"]+)"\]/g)) {
            if (!genres.includes(gm[1]) && !EX.has(gm[1].toLowerCase())) genres.push(gm[1]);
          }
          const dm = props.match(/"description":\[0,"<p>([\s\S]*?)<\/p>"\]/);
          if (dm) description = dm[1].replace(/\\"/g,'"').replace(/&nbsp;|&#160;/g," ").trim();
        } catch { /* */ }
      }
    });
    if (!description) { const d = $("div p").first(); if (d.length) description = d.text().trim().substring(0,500); }
    $("a[href*='/chapter/'], a[href*='/chapter-']").each((_,el) => {
      const u = $(el).attr("href") || "";
      if (!u) return;

      // Asura chapter rows have title and date in separate spans.
      const spans = $(el).find("span");
      let t = "";
      let date = "";

      if (spans.length >= 2) {
        t = $(spans[0]).text().replace(/\s+/g, " ").trim();
        date = $(spans[spans.length - 1]).text().replace(/\s+/g, " ").trim();
      }

      // Fallback if the row structure changes
      if (!t) {
        const raw = $(el).text();
        const split = splitChapterTitleAndDate(raw);
        t = split.title;
        date = date || split.date;
      }

      if (t) {
        chapters.push({
          title: t,
          url: u.startsWith("http") ? u : `https://asurascans.com${u}`,
          date,
        });
      }
    });
    if (!title) title = fallbackTitle;
    if (!title) return null;
    const uniqueChapters = dedupeChapters(chapters);
    return { title, description: description||"No description available.", rating, status: status.charAt(0).toUpperCase()+status.slice(1), type: type.charAt(0).toUpperCase()+type.slice(1), genres, chapters: uniqueChapters, chapterCount: chapterCount||String(uniqueChapters.length), coverUrl, url, source:"Source A", author, artist };
  } catch { return null; }
}

async function searchSource1(query: string): Promise<MangaResult[]> {
  try {
    const html = await fetchSafe(`https://asurascans.com/browse?q=${encodeURIComponent(query)}`);
    if (!html) return [];
    const $ = cheerio.load(html);
    const links: {title:string;href:string}[] = [];
    $("a[href*='/comics/']").each((_,el) => {
      const href=$(el).attr("href"); const t=$(el).find("h3").text().trim()||$(el).text().trim();
      if (href&&t&&t.length>0&&!links.find(l=>l.href===href)) links.push({title:t,href:href.startsWith("http")?href:`https://asurascans.com${href}`});
    });
    const results: MangaResult[] = [];
    const details = await Promise.all(links.map(async l => { const h = await fetchSafe(l.href); return h ? parseSource1Detail(h,l.href,l.title) : null; }));
    for (const d of details) if (d) results.push(d);
    return results;
  } catch { return []; }
}

// Browse multiple pages from Source 1 for catalog
async function browseSource1(page: number): Promise<MangaResult[]> {
  try {
    // Asura browse page (they use client-side rendering, but the browse page has items)
    const html = await fetchSafe(`https://asurascans.com/browse?page=${page}&sort=update`);
    if (!html) return [];
    const $ = cheerio.load(html);
    const links: {title:string;href:string}[] = [];
    $("a[href*='/comics/']").each((_,el) => {
      const href=$(el).attr("href"); const t=$(el).find("h3").text().trim();
      if (href&&t&&t.length>0&&!links.find(l=>l.href===href)) links.push({title:t,href:href.startsWith("http")?href:`https://asurascans.com${href}`});
    });
    const results: MangaResult[] = [];
    // Fetch details in batches of 6 (fast enough)
    const batch = links.slice(0, 18);
    const details = await Promise.all(batch.map(async l => { const h = await fetchSafe(l.href); return h ? parseSource1Detail(h,l.href,l.title) : null; }));
    for (const d of details) if (d) results.push(d);
    return results;
  } catch { return []; }
}

// ════════════════════════════════════════════════════════════════════
// SOURCE 2: DEMONIC SCANS
// ════════════════════════════════════════════════════════════════════

function parseSource2Detail(html: string, url: string): MangaResult | null {
  try {
    const $ = cheerio.load(html);
    const title = $("title").text().trim();
    if (!title || title.length === 0) return null;
    const coverUrl = $('meta[property="og:image"]').attr("content") || $('meta[name="image"]').attr("content") || $("#manga-page img").attr("src") || "";
    let rating = "N/A";
    $(".RVB").each((_,el) => { const t=$(el).text().trim(); const m=t.match(/^(\d+\.?\d*)$/); if(m&&parseFloat(m[1])<=10) rating=m[1]; });
    let description = "";
    const bodyText=$("body").text();
    const sm=bodyText.match(/The Summary is\s*([\s\S]*?)(?:\n\n|You must|$)/i);
    if (sm) description=sm[1].replace(/\s+/g," ").trim();
    if (!description) description=$('meta[property="og:description"]').attr("content")||"";
    let type="Manhwa"; const pt=$("body").text().toLowerCase();
    if(pt.includes("manhua")) type="Manhua"; else if(pt.includes("manga series")) type="Manga";
    const chapters: ChapterInfo[] = [];
    $("a[href*='chaptered.php'], a[href*='/chapter']").each((_,el) => {
      const raw = $(el).text();
      const { title: t, date } = splitChapterTitleAndDate(raw);
      const u = $(el).attr("href") || "";
      if (t && u && (t.toLowerCase().includes("chapter") || t.toLowerCase().includes("read"))) {
        chapters.push({
          title: t,
          url: u.startsWith("http") ? u : `https://demonicscans.org${u}`,
          date,
        });
      }
    });
    const uniqueChapters = dedupeChapters(chapters);
    return { title, description:description||"No description available.", rating, status:"Ongoing", type, genres:[], chapters: uniqueChapters, chapterCount:String(uniqueChapters.length), coverUrl, url, source:"Source B", author:"Unknown", artist:"Unknown" };
  } catch { return null; }
}

// Light-weight: parse listing page directly without fetching each detail
function parseSource2ListingPage(html: string): MangaResult[] {
  try {
    const $ = cheerio.load(html);
    const results: MangaResult[] = [];
    // Each manga card on demonicscans
    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.includes("/manga/page/")) return;
      
      const fullUrl = href.startsWith("http") ? href : `https://demonicscans.org${href}`;
      
      // Get the image inside or nearby
      const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
      
      // Title
      let title = $(el).find("h3, h4, h5, .manga-title, .title").text().trim();
      if (!title) title = $(el).attr("title") || "";
      if (!title) title = $(el).text().trim();
      
      if (!title || title.length < 3) return;
      if (results.find(r => r.url === fullUrl)) return;

      results.push({
        title,
        description: "",
        rating: "N/A",
        status: "Ongoing",
        type: "Manhwa",
        genres: [],
        chapters: [],
        chapterCount: "0",
        coverUrl: img,
        url: fullUrl,
        source: "Source B",
        author: "Unknown",
        artist: "Unknown",
      });
    });
    return results;
  } catch { return []; }
}

async function searchSource2(query: string): Promise<MangaResult[]> {
  try {
    const html = await fetchSafe("https://demonicscans.org/");
    if (!html) return [];
    const $ = cheerio.load(html);
    const links: {title:string;href:string}[] = [];
    const ql = query.toLowerCase();
    $("a[href*='/manga/']").each((_,el) => {
      const href=$(el).attr("href"); const t=$(el).text().trim();
      if(href&&t&&t.length>2&&!href.includes("/manga/page/")&&t.toLowerCase().includes(ql)&&!links.find(l=>l.href===href))
        links.push({title:t,href:href.startsWith("http")?href:`https://demonicscans.org${href}`});
    });
    const slug=query.trim().split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join("-");
    if(!links.find(l=>l.href.includes(slug))) links.push({title:query,href:`https://demonicscans.org/manga/${slug}`});
    const results: MangaResult[] = [];
    const details = await Promise.all(links.map(async l => { const h = await fetchSafe(l.href); return h ? parseSource2Detail(h,l.href) : null; }));
    for (const d of details) if (d) results.push(d);
    return results;
  } catch { return []; }
}

async function browseSource2(page: number): Promise<MangaResult[]> {
  try {
    // Demonic scans listing pages
    const urls = [
      `https://demonicscans.org/index.php`,
      `https://demonicscans.org/manga-list.php?page=${page}`,
      `https://demonicscans.org/latest.php?page=${page}`,
    ];
    const htmls = await Promise.all(urls.map(u => fetchSafe(u)));
    const allResults: MangaResult[] = [];
    
    for (const html of htmls) {
      if (!html) continue;
      const listing = parseSource2ListingPage(html);
      allResults.push(...listing);
    }

    // For items without cover/description, fetch details (limit batch)
    const needsDetail = allResults.filter(r => !r.coverUrl).slice(0, 10);
    if (needsDetail.length > 0) {
      const details = await Promise.all(needsDetail.map(async r => {
        const h = await fetchSafe(r.url);
        return h ? parseSource2Detail(h, r.url) : null;
      }));
      for (let i = 0; i < details.length; i++) {
        if (details[i]) {
          const idx = allResults.findIndex(r => r.url === needsDetail[i].url);
          if (idx >= 0) allResults[idx] = details[i]!;
        }
      }
    }

    // For items WITH cover from listing, still need to fetch detail for desc/rating
    const withCover = allResults.filter(r => r.coverUrl && !r.description).slice(0, 15);
    if (withCover.length > 0) {
      const details = await Promise.all(withCover.map(async r => {
        const h = await fetchSafe(r.url);
        return h ? parseSource2Detail(h, r.url) : null;
      }));
      for (let i = 0; i < details.length; i++) {
        if (details[i]) {
          const idx = allResults.findIndex(r => r.url === withCover[i].url);
          if (idx >= 0) allResults[idx] = details[i]!;
        }
      }
    }

    return allResults;
  } catch { return []; }
}

// ════════════════════════════════════════════════════════════════════
// SOURCE 3: SCYTHE SCANS (Madara WordPress)
// ════════════════════════════════════════════════════════════════════

function parseSource3Detail(html: string, url: string): MangaResult | null {
  try {
    const $ = cheerio.load(html);
    let title = ($('meta[property="og:title"]').attr("content")||"").replace(/\s*-\s*Scythe\s*Scans.*/i,"").trim();
    if (!title) title = $("title").text().replace(/\s*-\s*Scythe\s*Scans.*/i,"").trim();
    if (!title) return null;
    const coverUrl = $('meta[property="og:image"]').attr("content")||"";
    let description = $('meta[property="og:description"]').attr("content")||"";
    if (description.includes("Read your favorite manga")||description.includes("Scythe Scans")) {
      description = $('meta[name="description"]').attr("content")||"";
      if (description.includes("Read your favorite manga")||description.includes("Scythe Scans")) description = "";
    }
    if (!description) $(".summary__content p, .description-summary p, .manga-excerpt p").each((_,el) => { const t=$(el).text().trim(); if(t.length>50&&!description) description=t; });
    let rating="N/A"; const re=$(".post-total-rating .score, .total_votes, .rating-count"); if(re.length){const rm=re.text().trim().match(/(\d+\.?\d*)/); if(rm&&parseFloat(rm[1])<=10)rating=rm[1];}
    let status="Ongoing",type="Manhwa",author="Unknown",artist="Unknown"; const genres:string[]=[];
    $(".post-content_item").each((_,el)=>{const l=$(el).find(".summary-heading h5, .summary-heading").text().toLowerCase().trim();const v=$(el).find(".summary-content, .artist-content").text().trim();if(l.includes("status"))status=v||status;if(l.includes("type"))type=v||type;if(l.includes("author"))author=v||author;if(l.includes("artist"))artist=v||artist;});
    $(".genres-content a, .tags-content a").each((_,el)=>{const g=$(el).text().trim();if(g&&!genres.includes(g))genres.push(g);});
    const chapters:ChapterInfo[]=[];
    $("li.wp-manga-chapter a, .version-chap a").each((_,el)=>{
      const raw = $(el).text();
      const split = splitChapterTitleAndDate(raw);
      const t = split.title;
      const u = $(el).attr("href") || "";
      const d = $(el).closest("li").find(".chapter-release-date, span.chapter-time, i").text().trim() || split.date;
      if (t && u) chapters.push({ title: t, url: u.startsWith("http") ? u : `https://scythescans.com${u}`, date: d });
    });
    const uniqueChapters = dedupeChapters(chapters);
    return { title, description:description||"No description available.", rating, status, type, genres, chapters: uniqueChapters, chapterCount:String(uniqueChapters.length), coverUrl, url, source:"Source C", author, artist };
  } catch { return null; }
}

// Light parse listing from Scythe main/archive pages
function parseSource3ListingPage(html: string): MangaResult[] {
  try {
    const $ = cheerio.load(html);
    const results: MangaResult[] = [];
    
    // Madara theme manga items
    $(".page-item-detail, .manga, article").each((_, el) => {
      const link = $(el).find("a[href*='/manga/']").first();
      const href = link.attr("href");
      if (!href || !href.includes("/manga/")) return;
      
      const fullUrl = href.startsWith("http") ? href : `https://scythescans.com${href}`;
      let title = $(el).find(".post-title h3 a, .post-title h5 a, h3 a, h5 a").text().trim();
      if (!title) title = link.attr("title") || link.text().trim();
      const coverUrl = $(el).find("img").attr("data-src") || $(el).find("img").attr("src") || "";
      
      const ratingEl = $(el).find(".score, .total_votes, .rating");
      let rating = "N/A";
      if (ratingEl.length) {
        const rm = ratingEl.text().trim().match(/(\d+\.?\d*)/);
        if (rm && parseFloat(rm[1]) <= 10) rating = rm[1];
      }
      
      const chEl = $(el).find(".chapter, .btn-link, a[href*='chapter']").first();
      const latestCh = chEl.text().trim();
      
      if (!title || title.length < 3) return;
      if (results.find(r => r.url === fullUrl)) return;
      
      results.push({
        title,
        description: "",
        rating,
        status: "Ongoing",
        type: "Manhwa",
        genres: [],
        chapters: [],
        chapterCount: latestCh ? latestCh.replace(/\D/g, "") : "0",
        coverUrl,
        url: fullUrl,
        source: "Source C",
        author: "Unknown",
        artist: "Unknown",
      });
    });
    
    // Also scan raw links with images
    if (results.length === 0) {
      $("a[href*='/manga/']").each((_, el) => {
        const href = $(el).attr("href");
        if (!href || href.includes("/manga/page/")) return;
        const fullUrl = href.startsWith("http") ? href : `https://scythescans.com${href}`;
        let title = $(el).find("h3, h4, h5, .post-title").text().trim() || $(el).attr("title") || "";
        if (!title) title = $(el).text().trim();
        const img = $(el).find("img").attr("data-src") || $(el).find("img").attr("src") || "";
        if (!title || title.length < 3) return;
        if (results.find(r => r.url === fullUrl)) return;
        results.push({ title, description:"", rating:"N/A", status:"Ongoing", type:"Manhwa", genres:[], chapters:[], chapterCount:"0", coverUrl:img, url:fullUrl, source:"Source C", author:"Unknown", artist:"Unknown" });
      });
    }
    
    return results;
  } catch { return []; }
}

async function searchSource3(query: string): Promise<MangaResult[]> {
  try {
    const html = await fetchSafe(`https://scythescans.com/?s=${encodeURIComponent(query)}&post_type=wp-manga`);
    if (!html) return [];
    const $ = cheerio.load(html);
    const links:{title:string;href:string}[]=[];
    $("a[href*='/manga/']").each((_,el)=>{const h=$(el).attr("href");const t=$(el).find("h3,h4,.post-title").text().trim()||$(el).text().trim();if(h&&h.includes("/manga/")&&!h.includes("/manga/page/")&&t&&t.length>1&&!links.find(l=>l.href===h))links.push({title:t,href:h.startsWith("http")?h:`https://scythescans.com${h}`});});
    if(links.length===0){const s=query.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");links.push({title:query,href:`https://scythescans.com/manga/${s}/`});}
    const results:MangaResult[]=[];
    const details = await Promise.all(links.map(async l => { const h=await fetchSafe(l.href); return h?parseSource3Detail(h,l.href):null; }));
    for(const d of details)if(d)results.push(d);
    return results;
  } catch { return []; }
}

async function browseSource3(page: number): Promise<MangaResult[]> {
  try {
    const urls = [
      `https://scythescans.com/page/${page}/`,
      `https://scythescans.com/manga/page/${page}/`,
    ];
    const htmls = await Promise.all(urls.map(u => fetchSafe(u)));
    const allResults: MangaResult[] = [];
    
    for (const html of htmls) {
      if (!html) continue;
      allResults.push(...parseSource3ListingPage(html));
    }
    
    // Fetch details for items without descriptions (limit to 10 per batch)
    const needsDetail = allResults.filter(r => !r.description).slice(0, 10);
    if (needsDetail.length > 0) {
      const details = await Promise.all(needsDetail.map(async r => {
        const h = await fetchSafe(r.url);
        return h ? parseSource3Detail(h, r.url) : null;
      }));
      for (let i = 0; i < details.length; i++) {
        if (details[i]) {
          const idx = allResults.findIndex(r => r.url === needsDetail[i].url);
          if (idx >= 0) allResults[idx] = details[i]!;
        }
      }
    }
    
    return allResults;
  } catch { return []; }
}



// ════════════════════════════════════════════════════════════════════
// RELEVANCE CHECK
// ════════════════════════════════════════════════════════════════════

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getRelevanceScore(result: MangaResult, query: string): number {
  const q = normalizeText(query);
  const qWords = q.split(" ").filter(w => w.length > 1);
  const title = normalizeText(result.title);
  const desc = normalizeText(result.description);

  let score = 0;

  // Strong title signals
  if (title === q) score += 1000;
  if (title.includes(q)) score += 300;
  if (q.includes(title) && title.length > 8) score += 120;

  const titleWordMatches = qWords.filter(w => title.includes(w)).length;
  const descWordMatches = qWords.filter(w => desc.includes(w)).length;

  score += titleWordMatches * 25;
  score += descWordMatches * 5;

  // Prefer close title length / structure for long exact searches
  if (qWords.length >= 4) {
    const titleCoverage = titleWordMatches / qWords.length;
    if (titleCoverage >= 0.8) score += 120;
    else if (titleCoverage >= 0.6) score += 50;
  }

  return score;
}

function isRelevant(result: MangaResult, query: string): boolean {
  const q = normalizeText(query);
  const qWords = q.split(" ").filter(w => w.length > 1);
  const titleLower = normalizeText(result.title);
  const descLower = normalizeText(result.description);
  const BAD = ["manga lists","latest updates","popular","home","search","scythe scans","demonic scans"];
  if (BAD.some(s => titleLower === s || titleLower.includes(s))) return false;

  const titleWordMatches = qWords.filter(w => titleLower.includes(w)).length;
  const anyWordMatches = qWords.filter(w => titleLower.includes(w) || descLower.includes(w)).length;

  // Exact / near exact title searches should require much stronger title overlap
  if (qWords.length >= 4) {
    if (titleLower === q || titleLower.includes(q)) return true;
    return titleWordMatches >= Math.ceil(qWords.length * 0.6);
  }

  return anyWordMatches >= Math.max(1, Math.floor(qWords.length * 0.5));
}

function isValidEntry(r: MangaResult): boolean {
  if (!r.title || r.title.length < 3) return false;
  const BAD = ["manga lists","latest updates","home","search","scythe scans","demonic scans","page not found","404"];
  return !BAD.some(s => r.title.toLowerCase().includes(s));
}

// ════════════════════════════════════════════════════════════════════
// MAIN SEARCH (PARALLEL)
// ════════════════════════════════════════════════════════════════════

export async function searchAllSources(query: string): Promise<MangaResult[]> {
  const [r1,r2,r3] = await Promise.allSettled([searchSource1(query),searchSource2(query),searchSource3(query)]);
  const results: MangaResult[] = [];
  if(r1.status==="fulfilled")results.push(...r1.value);
  if(r2.status==="fulfilled")results.push(...r2.value);
  if(r3.status==="fulfilled")results.push(...r3.value);
  const relevant = results
    .filter(r => isRelevant(r, query))
    .sort((a, b) => getRelevanceScore(b, query) - getRelevanceScore(a, query));
  const seen=new Set<string>(); const unique:MangaResult[]=[];
  for(const r of relevant){const k=r.title.toLowerCase().replace(/[^a-z0-9]/g,"");if(!seen.has(k)&&k.length>2){seen.add(k);unique.push(r);}}
  return unique;
}

// ════════════════════════════════════════════════════════════════════
// BROWSE / TRENDING WITH PAGINATION  (page = 1,2,3,...)
// Fetches from all sources in parallel, returns ~30 per page
// ════════════════════════════════════════════════════════════════════

export async function browseCatalog(page: number): Promise<{ results: MangaResult[]; hasMore: boolean }> {
  // Each source contributes to the catalog
  const [r1, r2, r3] = await Promise.allSettled([
    browseSource1(page),
    browseSource2(page),
    browseSource3(page),
  ]);

  const results: MangaResult[] = [];
  if (r1.status === "fulfilled") results.push(...r1.value);
  if (r2.status === "fulfilled") results.push(...r2.value);
  if (r3.status === "fulfilled") results.push(...r3.value);

  // Filter valid entries
  const valid = results.filter(isValidEntry);

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

  return {
    results: unique.slice(0, 30),
    hasMore: unique.length > 0 && page < 17, // ~500 items across 17 pages
  };
}

// Keep old function for backward compat
export async function getTrendingAll(): Promise<MangaResult[]> {
  const { results } = await browseCatalog(1);
  return results;
}
