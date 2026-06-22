import { NextRequest, NextResponse } from "next/server";
import { scrapeWebtoonGenre, WEBTOON_GENRE_SLUGS } from "@/lib/webtoon-genres";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardPrivateApi } from "@/lib/originGuard";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const guard = guardPrivateApi(req);
  if (guard) return guard as NextResponse;

  try {
    await ensureIndexes();

    let totalInserted = 0;
    let totalUpdated = 0;
    const genreStats: Record<string, number> = {};

    for (const slug of WEBTOON_GENRE_SLUGS) {
      try {
        const results = await scrapeWebtoonGenre(slug);
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
      inserted: totalInserted,
      updated: totalUpdated,
      genreStats,
      totalGenres: WEBTOON_GENRE_SLUGS.length,
    });
  } catch (err) {
    console.error("Webtoon sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
