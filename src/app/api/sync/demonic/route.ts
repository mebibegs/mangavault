import { NextRequest, NextResponse } from "next/server";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";
import * as cheerio from "cheerio";
import type { MangaResult } from "@/lib/scraper";

export const maxDuration = 120;

/**
 * Demonic Scans sync — split 350 listing pages into batches of 90.
 *
 * GET /api/sync/demonic            → all batches info
 * GET /api/sync/demonic?batch=1    → pages 1-90
 * GET /api/sync/demonic?batch=2    → pages 91-180
 * GET /api/sync/demonic?batch=3    → pages 181-270
 * GET /api/sync/demonic?batch=4    → pages 271-350
 */

const TOTAL_BATCHES = 4;

const BATCH_RANGES: Record<number, [number, number]> = {
  1: [1, 90],
  2: [91, 180],
  3: [181, 270],
  4: [271, 350],
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchDemonicPage(url: string): Promise<string | null> {
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

function parseDemonicListPage(html: string): MangaResult[] {
  const $ = cheerio.load(html);
  const cards = new Map<string, { title: string; img: string; href: string }>();

  $("a[href*='/manga/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.includes("/manga/") || href.includes("/manga/page/")) return;
    if (!cards.has(href)) cards.set(href, { href, title: "", img: "" });
    const card = cards.get(href)!;
    const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
    if (img && !card.img) card.img = img;
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 200 && !card.title) card.title = text;
  });

  const results: MangaResult[] = [];
  for (const [, card] of cards) {
    let title = card.title;
    if (!title || title.length < 2) {
      try {
        const slug = decodeURIComponent(decodeURIComponent(card.href.split("/manga/")[1] || ""));
        title = slug.replace(/-/g, " ").replace(/\\/g, "'");
      } catch { continue; }
    }
    if (!title || title.length < 2) continue;
    const fullUrl = card.href.startsWith("http") ? card.href : `https://demonicscans.org${card.href}`;
    results.push({
      title,
      description: "",
      rating: "N/A",
      status: "Ongoing",
      type: "Manhwa",
      genres: [],
      chapters: [],
      chapterCount: "0",
      coverUrl: card.img,
      url: fullUrl,
      source: "Demonic Scans",
      author: "Unknown",
      artist: "Unknown",
    });
  }
  return results;
}

async function scrapeDemonicPages(startPage: number, endPage: number): Promise<MangaResult[]> {
  const seen = new Map<string, MangaResult>();
  let consecutiveEmpty = 0;

  for (let start = startPage; start <= endPage; start += 5) {
    const pages = Array.from({ length: Math.min(5, endPage - start + 1) }, (_, i) => start + i);
    const htmls = await Promise.allSettled(
      pages.map((p) => fetchDemonicPage(`https://demonicscans.org/lastupdates.php?list=${p}`))
    );

    let batchNew = 0;
    for (const r of htmls) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const titles = parseDemonicListPage(r.value);
      for (const t of titles) {
        const key = t.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length >= 3 && !seen.has(key)) {
          seen.set(key, t);
          batchNew++;
        }
      }
    }

    if (batchNew === 0) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 2) break;
    } else {
      consecutiveEmpty = 0;
    }
  }

  return [...seen.values()];
}

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  const batchParam = req.nextUrl.searchParams.get("batch");

  if (!batchParam) {
    return NextResponse.json({
      source: "demonic",
      totalBatches: TOTAL_BATCHES,
      batches: Object.entries(BATCH_RANGES).map(([b, [s, e]]) => ({
        batch: Number(b),
        pages: `${s}-${e}`,
      })),
      usage: "GET /api/sync/demonic?batch=1",
    });
  }

  const batch = parseInt(batchParam, 10);
  if (!BATCH_RANGES[batch]) {
    return NextResponse.json(
      { error: `Invalid batch. Use 1-${TOTAL_BATCHES}` },
      { status: 400 }
    );
  }

  try {
    await ensureIndexes();
    const [startPage, endPage] = BATCH_RANGES[batch];
    const results = await scrapeDemonicPages(startPage, endPage);

    let inserted = 0, updated = 0;
    for (let i = 0; i < results.length; i += 200) {
      const stats = await upsertResults(results.slice(i, i + 200));
      inserted += stats.inserted;
      updated += stats.updated;
    }

    return NextResponse.json({
      success: true,
      source: "demonic",
      batch,
      pages: `${startPage}-${endPage}`,
      scraped: results.length,
      inserted,
      updated,
    });
  } catch (err) {
    console.error("Demonic sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
