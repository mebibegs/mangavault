import { NextRequest, NextResponse } from "next/server";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";
import type { MangaResult } from "@/lib/scraper";

export const maxDuration = 120;

/**
 * Omega Scans sync — split into batches by API page ranges.
 *
 * GET /api/sync/omega            → all batches info
 * GET /api/sync/omega?batch=1    → pages 1-7   (~100 titles)
 * GET /api/sync/omega?batch=2    → pages 8-14  (~100 titles)
 * GET /api/sync/omega?batch=3    → pages 15-20 (~71 titles)
 */

const TOTAL_BATCHES = 3;

const BATCH_RANGES: Record<number, [number, number]> = {
  1: [1, 7],
  2: [8, 14],
  3: [15, 20],
};

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

function toMangaResult(s: OmegaSeries): MangaResult {
  const genres = (s.tags || []).map((t) => t.name).filter(Boolean);
  const desc = (s.description || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return {
    title: s.title,
    description: desc || "No description available.",
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

async function scrapeOmegaPages(startPage: number, endPage: number): Promise<MangaResult[]> {
  const results: MangaResult[] = [];
  const seen = new Set<string>();

  for (let page = startPage; page <= endPage; page++) {
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

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  const batchParam = req.nextUrl.searchParams.get("batch");

  // No batch = return info about available batches
  if (!batchParam) {
    return NextResponse.json({
      source: "omega",
      totalBatches: TOTAL_BATCHES,
      batches: Object.entries(BATCH_RANGES).map(([b, [s, e]]) => ({
        batch: Number(b),
        pages: `${s}-${e}`,
      })),
      usage: "GET /api/sync/omega?batch=1",
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
    const results = await scrapeOmegaPages(startPage, endPage);

    let inserted = 0, updated = 0;
    for (let i = 0; i < results.length; i += 200) {
      const stats = await upsertResults(results.slice(i, i + 200));
      inserted += stats.inserted;
      updated += stats.updated;
    }

    return NextResponse.json({
      success: true,
      source: "omega",
      batch,
      pages: `${startPage}-${endPage}`,
      scraped: results.length,
      inserted,
      updated,
    });
  } catch (err) {
    console.error("Omega sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
