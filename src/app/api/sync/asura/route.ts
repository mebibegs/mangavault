import { NextRequest, NextResponse } from "next/server";
import { scrapeAsuraGenre, ASURA_GENRE_SLUGS } from "@/lib/asura-genres";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  try {
    await ensureIndexes();

    let totalInserted = 0;
    let totalUpdated = 0;
    const genreStats: Record<string, number> = {};

    for (const slug of ASURA_GENRE_SLUGS) {
      try {
        const results = await scrapeAsuraGenre(slug);
        genreStats[slug] = results.length;

        if (results.length > 0) {
          const stats = await upsertResults(results);
          totalInserted += stats.inserted;
          totalUpdated += stats.updated;
        }
      } catch {
        genreStats[slug] = -1;
      }
    }

    return NextResponse.json({
      success: true,
      source: "asura",
      inserted: totalInserted,
      updated: totalUpdated,
      genreStats,
      totalGenres: ASURA_GENRE_SLUGS.length,
    });
  } catch (err) {
    console.error("Asura sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
