import { NextRequest, NextResponse } from "next/server";
import { refreshChapters } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";

export const maxDuration = 60;

/**
 * Cron endpoint — designed to run every 15 minutes.
 *
 * Each run:
 *   1. Picks the 30 oldest-refreshed titles from the DB
 *   2. Re-scrapes them to find new chapters
 *   3. Merges any new chapters + metadata updates
 *   4. Also checks browse pages 1-2 for brand-new titles
 *
 * Over a full day (96 runs × 30 titles = 2,880 titles refreshed),
 * the entire 14k+ catalog gets cycled through every ~5 days.
 *
 * Query params:
 *   ?limit=50  — how many titles to refresh (default 30)
 */
export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(100, Math.max(5, parseInt(limitParam || "30", 10) || 30));

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureIndexes();
    const stats = await refreshChapters(limit);

    return NextResponse.json({
      success: true,
      protected: Boolean(cronSecret),
      ...stats,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
