import { NextRequest, NextResponse } from "next/server";
import { fullSync, quickSync, deepSync } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";

export const maxDuration = 300; // 5 min for deep sync

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") || "quick";

  try {
    await ensureIndexes();

    let stats;
    switch (mode) {
      case "deep":
        stats = await deepSync();
        break;
      case "full":
        stats = await fullSync();
        break;
      default:
        stats = await quickSync();
        break;
    }

    return NextResponse.json({
      success: true,
      mode,
      ...stats,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
