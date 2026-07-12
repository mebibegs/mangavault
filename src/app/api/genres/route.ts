import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    const genre = req.nextUrl.searchParams.get("q")?.trim();
    if (!genre) return NextResponse.json({ error: "Missing genre" }, { status: 400 });

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "30", 10) || 30));

    const db = await getMongoDb();
    if (!db) return NextResponse.json({ success: true, genre, results: [], total: 0, page, hasMore: false });

    const titles = db.collection("titles");
    const filter = { genres: { $regex: new RegExp(`^${escapeRegex(genre)}$`, "i") } };
    const total = await titles.countDocuments(filter);
    const docs = await titles
      .find(filter)
      .sort({ rating: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      genre,
      results: docs.map((d) => toSafeResult(d as Record<string, unknown>)),
      total,
      page,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error("Genres API Error:", err);
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
  }
}
