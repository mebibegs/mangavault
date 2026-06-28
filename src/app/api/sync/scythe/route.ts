import { NextRequest, NextResponse } from "next/server";
import { scrapeAllScytheGenres } from "@/lib/scythe-genres";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  try {
    await ensureIndexes();

    const results = await scrapeAllScytheGenres();
    const stats = await upsertResults(results);

    return NextResponse.json({
      success: true,
      source: "scythe",
      scraped: results.length,
      inserted: stats.inserted,
      updated: stats.updated,
    });
  } catch (err) {
    console.error("Scythe sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
