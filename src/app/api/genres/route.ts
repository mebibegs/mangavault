import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult, ADULT_GENRES } from "@/lib/safeResult";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSort(sortParam: string): Record<string, 1 | -1> {
  switch (sortParam) {
    case "popular":
      return { rating: -1, chapterCount: -1, publishedAt: -1, updatedAt: -1 };
    case "title":
      return { title: 1 };
    case "rating":
      return { rating: -1, publishedAt: -1, updatedAt: -1 };
    case "chapters":
      return { chapterCount: -1, publishedAt: -1, updatedAt: -1 };
    case "updated":
    default:
      return { publishedAt: -1, updatedAt: -1 };
  }
}

export async function GET(req: NextRequest) {
  try {
    const genre = req.nextUrl.searchParams.get("q")?.trim();
    if (!genre) return NextResponse.json({ error: "Missing genre" }, { status: 400 });

    // Block adult genres from regular genres endpoint
    if (ADULT_GENRES.some(ag => ag.toLowerCase() === genre.toLowerCase())) {
      return NextResponse.json({ error: "Genre not found" }, { status: 404 });
    }

    const rawPage = parseInt(req.nextUrl.searchParams.get("page") || "1", 10) || 1;
    const page = Math.max(1, Math.min(660, rawPage));
    const limit = Math.min(60, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "30", 10) || 30));
    const sortParam = req.nextUrl.searchParams.get("sort") || "updated";

    const db = await getMongoDb();
    if (!db) return NextResponse.json({ success: true, genre, results: [], total: 0, page, hasMore: false });

    const titles = db.collection("titles");
    const filter = { genres: { $regex: new RegExp(`^${escapeRegex(genre)}$`, "i") } };
    const total = await titles.countDocuments(filter);
    const sort = getSort(sortParam);
    const docs = await titles
      .find(filter)
      .sort(sort)
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
