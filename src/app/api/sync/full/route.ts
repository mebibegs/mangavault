/**
 * Full Sync API Route
 * 
 * Triggers a complete scrape and sync of all manga sources
 * POST /api/sync/full
 * 
 * Query params:
 * - sources: comma-separated list of sources to sync (optional)
 * - clear: "true" to clear existing data first (optional)
 * - quick: "true" to limit to 100 titles per source (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { runFullSync, runFreshSync, runQuickSync, runSourceSync } from "@/lib/sync-manager";
import { guardPrivateApi } from "@/lib/originGuard";
import { ensureMangaIndexes, getDbStats } from "@/lib/manga-db";

export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Require authentication for sync operations
  const guard = guardPrivateApi(req);
  if (guard) return guard as NextResponse;

  try {
    const searchParams = req.nextUrl.searchParams;
    const sources = searchParams.get("sources")?.split(",").filter(Boolean);
    const clearFirst = searchParams.get("clear") === "true";
    const quick = searchParams.get("quick") === "true";

    // Log sync start
    console.log(`[API] Starting sync: sources=${sources?.join(",") || "all"}, clear=${clearFirst}, quick=${quick}`);

    let result;

    if (quick) {
      result = await runQuickSync();
    } else if (clearFirst) {
      result = await runFreshSync();
    } else if (sources?.length) {
      // Sync specific sources
      const sourceResults = [];
      for (const source of sources) {
        const sourceResult = await runSourceSync(source);
        sourceResults.push(sourceResult);
      }
      
      const stats = await getDbStats();
      
      result = {
        success: true,
        startedAt: new Date(),
        completedAt: new Date(),
        totalDuration: sourceResults.reduce((sum, r) => sum + r.duration, 0),
        totalInserted: sourceResults.reduce((sum, r) => sum + r.inserted, 0),
        totalUpdated: sourceResults.reduce((sum, r) => sum + r.updated, 0),
        totalMerged: sourceResults.reduce((sum, r) => sum + r.merged, 0),
        totalFailed: sourceResults.reduce((sum, r) => sum + r.failed, 0),
        totalDocuments: stats.total,
        sourceResults,
        errors: sourceResults.flatMap(r => r.errors),
      };
    } else {
      result = await runFullSync();
    }

    console.log(`[API] Sync complete: ${result.totalDocuments} total, ${result.totalInserted} inserted, ${result.totalMerged} merged`);

    return NextResponse.json(result);

  } catch (err) {
    console.error("[API] Sync error:", err);
    return NextResponse.json(
      { 
        error: "Sync failed", 
        message: err instanceof Error ? err.message : String(err) 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // GET returns current database stats
  try {
    const stats = await getDbStats();
    
    return NextResponse.json({
      status: "ready",
      stats,
      availableSources: [
        "Omega Scans",
        "Asura Scans",
        "Manganato",
        "Webtoons",
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
