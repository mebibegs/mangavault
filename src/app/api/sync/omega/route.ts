import { NextRequest, NextResponse } from "next/server";
import { scrapeAllOmegaTitles } from "@/lib/omega-scraper";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  try {
    await ensureIndexes();
    const results = await scrapeAllOmegaTitles();

    let inserted = 0, updated = 0;
    for (let i = 0; i < results.length; i += 200) {
      const stats = await upsertResults(results.slice(i, i + 200));
      inserted += stats.inserted;
      updated += stats.updated;
    }

    return NextResponse.json({
      success: true,
      source: "omega",
      scraped: results.length,
      inserted,
      updated,
    });
  } catch (err) {
    console.error("Omega sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
