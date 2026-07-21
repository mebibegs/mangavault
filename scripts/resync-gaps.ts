import { config } from "dotenv";
config({ path: ".env.local" });

import * as cheerio from "cheerio";
import * as fs from "fs";

const BASE = "https://www.manganato.gg/manga-list/latest-manga";
const CONCURRENT = 2;          // gentle on the server
const DELAY_MS = 3500;         // base delay between batches
const JITTER_MS = 1500;        // random extra delay
const MAX_RETRIES = 6;
const RETRY_ROUNDS = 3;        // extra passes over failed pages at the end
const STATE_FILE = "scripts/.resync-gaps-state.json";

const H = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function jitter(base: number) { return base + Math.random() * JITTER_MS; }

interface TitleInfo { slug: string; title: string; coverUrl: string; }
interface State { donePages: number[]; }

function loadState(): State {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { donePages: [] }; }
}
function saveState(s: State) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s));
}

async function fetchPage(url: string, page: number): Promise<string | null> {
  for (let a = 1; a <= MAX_RETRIES; a++) {
    try {
      const res = await fetch(url, { headers: H, signal: AbortSignal.timeout(45000) });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 5000) return text;
        console.log(`  [P${page}] suspiciously short response (${text.length}b), retry ${a}/${MAX_RETRIES}`);
        await sleep(jitter(5000 * a));
        continue;
      }
      if (res.status === 429) {
        const w = 15000 * Math.pow(2, a - 1) + Math.random() * 5000; // 15s, 30s, 60s, 120s...
        console.log(`  [P${page}] 429, backoff ${(w / 1000).toFixed(0)}s (${a}/${MAX_RETRIES})`);
        await sleep(w);
        continue;
      }
      if (res.status >= 500 || res.status === 403 || res.status === 520) {
        const w = jitter(8000 * a);
        console.log(`  [P${page}] HTTP ${res.status}, wait ${(w / 1000).toFixed(0)}s (${a}/${MAX_RETRIES})`);
        await sleep(w);
        continue;
      }
      console.log(`  [P${page}] HTTP ${res.status} (${a}/${MAX_RETRIES})`);
      await sleep(jitter(5000 * a));
    } catch {
      const w = jitter(6000 * a);
      console.log(`  [P${page}] timeout/network error, wait ${(w / 1000).toFixed(0)}s (${a}/${MAX_RETRIES})`);
      await sleep(w);
    }
  }
  return null;
}

function extractAllTitles(html: string): TitleInfo[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const titles: TitleInfo[] = [];

  $("a[href*='/manga/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("/manga/page") || href.includes("?")) return;
    const m = href.match(/manga\/([a-z0-9][a-z0-9-]*)/i);
    if (!m || seen.has(m[1])) return;

    const link = $(el);
    const img = link.find("img").first();
    const coverUrl = img.attr("src") || img.attr("data-src") || "";
    let title = link.attr("title") || img.attr("alt") || "";
    if (!title || title.length < 2) title = link.text().replace(/\s+/g, " ").trim();
    if (!title || title.length < 2) return;

    seen.add(m[1]);
    titles.push({ slug: m[1], title, coverUrl });
  });

  return titles;
}

async function run() {
  const { MongoClient } = await import("mongodb");

  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 30000, tls: true, maxPoolSize: 5,
  });
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || "mangavault").collection("titles");

  console.log("=== Manganato Gap-Fill Re-Scrape (slow + retries) ===\n");
  console.log(`Config: concurrency=${CONCURRENT}, delay=${DELAY_MS}ms+jitter, retries=${MAX_RETRIES}, retryRounds=${RETRY_ROUNDS}\n`);

  const existing = await col.find({ source: "Manganato" }, { projection: { url: 1 } }).toArray();
  const existingSlugs = new Set<string>();
  for (const d of existing) {
    const m = (d.url as string).match(/manga\/([a-z0-9][a-z0-9-]*)/i);
    if (m) existingSlugs.add(m[1]);
  }
  console.log(`Existing Manganato titles: ${existingSlugs.size}`);

  const p1h = await fetchPage(BASE, 1);
  if (!p1h) { console.error("Page 1 failed after all retries"); process.exit(1); }
  const $1 = cheerio.load(p1h);
  let maxPage = 1;
  $1("a.page_blue, .panel_page_number a, .group_page a").each((_, el) => {
    const m = ($1(el).attr("href") || "").match(/[?&]page=(\d+)/);
    if (m) maxPage = Math.max(maxPage, parseInt(m[1], 10));
  });
  const totalMatch = $1("body").text().match(/Total\s*:?\s*([\d,]+)/i);
  const siteTotal = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ""), 10) : 0;
  console.log(`Max pages: ${maxPage} | Site total: ${siteTotal || "unknown"}\n`);

  const state = loadState();
  const doneSet = new Set(state.donePages);
  if (doneSet.size) console.log(`Resuming: ${doneSet.size} pages already done in previous run\n`);

  let totalNew = 0;

  async function insertBatch(titles: TitleInfo[]): Promise<number> {
    const newT = titles.filter(t => !existingSlugs.has(t.slug));
    if (!newT.length) return 0;
    const docs = newT.map(t => ({
      titleKey: t.title.toLowerCase().replace(/[^a-z0-9]/g, ""),
      title: t.title, description: "No description available.", rating: "N/A",
      status: "Ongoing", type: "Manga", genres: [], author: "Unknown", artist: "Unknown",
      coverUrl: t.coverUrl, url: `https://www.manganato.gg/manga/${t.slug}`,
      source: "Manganato", chapterCount: "0", chapters: [],
      sources: [{ name: "Manganato", url: `https://www.manganato.gg/manga/${t.slug}`, lastSeen: new Date() }],
      createdAt: new Date(), updatedAt: new Date(),
    }));
    try {
      const r = await col.insertMany(docs, { ordered: false });
      for (const t of newT) existingSlugs.add(t.slug);
      return r.insertedCount;
    } catch (err: unknown) {
      for (const t of newT) existingSlugs.add(t.slug);
      if (err && typeof err === "object" && "insertedCount" in err)
        return (err as { insertedCount: number }).insertedCount;
      return 0;
    }
  }

  totalNew += await insertBatch(extractAllTitles(p1h));
  doneSet.add(1);

  const start = Date.now();

  async function sweep(pages: number[], label: string): Promise<number[]> {
    const failed: number[] = [];
    let processed = 0;

    for (let i = 0; i < pages.length; i += CONCURRENT) {
      const batch = pages.slice(i, i + CONCURRENT);

      await Promise.all(batch.map(async (page) => {
        const url = `${BASE}?page=${page}`;
        const html = await fetchPage(url, page);
        if (!html) { failed.push(page); return; }
        const titles = extractAllTitles(html);
        if (titles.length === 0) { failed.push(page); return; }
        const added = await insertBatch(titles);
        totalNew += added;
        doneSet.add(page);
      }));

      processed += batch.length;
      if (processed % 50 < CONCURRENT || processed >= pages.length) {
        const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
        const pct = (processed / pages.length * 100).toFixed(1);
        console.log(`[${label}] ${processed}/${pages.length} (${pct}%) | +${totalNew} new | known: ${existingSlugs.size} | failed: ${failed.length} | ${elapsed}min`);
        saveState({ donePages: [...doneSet] });
      }

      await sleep(jitter(DELAY_MS));
    }
    saveState({ donePages: [...doneSet] });
    return failed;
  }

  const pending: number[] = [];
  for (let p = 2; p <= maxPage; p++) if (!doneSet.has(p)) pending.push(p);
  console.log(`Pages to fetch this run: ${pending.length}\n`);

  let failed = await sweep(pending, "main");

  for (let round = 1; round <= RETRY_ROUNDS && failed.length > 0; round++) {
    const cooldown = 60000 * round;
    console.log(`\n--- Retry round ${round}: ${failed.length} failed pages, cooling down ${cooldown / 1000}s first ---`);
    await sleep(cooldown);
    failed = await sweep(failed, `retry${round}`);
  }

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
  const mangInDb = await col.countDocuments({ source: "Manganato" });

  console.log(`\n=== DONE ===`);
  console.log(`Time: ${elapsed} minutes`);
  console.log(`New inserted this run: ${totalNew}`);
  console.log(`Pages still failed: ${failed.length}${failed.length ? " -> " + failed.slice(0, 50).join(",") : ""}`);
  console.log(`Manganato in DB: ${mangInDb}`);
  if (siteTotal) console.log(`Site total: ${siteTotal} | Remaining gap: ${Math.max(0, siteTotal - mangInDb)}`);

  if (failed.length === 0) {
    try { fs.unlinkSync(STATE_FILE); } catch { /* ignore */ }
  }

  await client.close();
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
