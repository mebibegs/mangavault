/**
 * Manga Database Stats API
 * 
 * GET /api/manga/stats
 * Returns statistics about the manga database
 */

import { NextRequest, NextResponse } from "next/server";
import { getDbStats, getAllGenres } from "@/lib/manga-db";
import { getAvailableSources } from "@/lib/scrapers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const stats = await getDbStats();
    const genres = await getAllGenres();

    return NextResponse.json({
      database: {
        total: stats.total,
        restricted: stats.restricted,
        safe: stats.total - stats.restricted,
      },
      byType: stats.byType,
      byStatus: stats.byStatus,
      sources: {
        active: stats.sources,
        available: getAvailableSources(),
      },
      genres: {
        total: genres.length,
        list: genres,
      },
      lastUpdated: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[API] Stats error:", err);
    return NextResponse.json(
      { error: "Failed to get stats", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
