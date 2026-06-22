import { NextRequest, NextResponse } from "next/server";
import { scrapeAtsuTitles } from "@/lib/atsu-scraper";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardPrivateApi } from "@/lib/originGuard";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const guard = guardPrivateApi(req);
  if (guard) return guard as NextResponse;

  const limit = Math.min(2000, parseInt(req.nextUrl.searchParams.get("limit") || "500", 10));

  try {
    await ensureIndexes();
    const results = await scrapeAtsuTitles(limit);

    let inserted = 0, updated = 0;
    for (let i = 0; i < results.length; i += 200) {
      const stats = await upsertResults(results.slice(i, i + 200));
      inserted += stats.inserted;
      updated += stats.updated;
    }

    return NextResponse.json({
      success: true,
      scraped: results.length,
      inserted,
      updated,
    });
  } catch (err) {
    console.error("Atsu sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
