import { NextRequest, NextResponse } from "next/server";
import { scrapeAllDemonicTitles } from "@/lib/demonic-genres";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  try {
    await ensureIndexes();

    const results = await scrapeAllDemonicTitles();
    let totalInserted = 0;
    let totalUpdated = 0;

    for (let i = 0; i < results.length; i += 200) {
      const batch = results.slice(i, i + 200);
      const stats = await upsertResults(batch);
      totalInserted += stats.inserted;
      totalUpdated += stats.updated;
    }

    return NextResponse.json({
      success: true,
      source: "demonic",
      scraped: results.length,
      inserted: totalInserted,
      updated: totalUpdated,
    });
  } catch (err) {
    console.error("Demonic sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
