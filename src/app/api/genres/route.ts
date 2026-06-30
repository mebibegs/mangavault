import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";

export async function GET(req: NextRequest) {
  try {
    const genre = req.nextUrl.searchParams.get("q");
    if (!genre) return NextResponse.json({ error: "Missing genre" }, { status: 400 });

    const db = await getMongoDb();
    if (!db) return NextResponse.json({ results: [] });

    const titles = db.collection("titles");
    
    // Find all titles that contain this genre, sorting by highest rated/most recently updated
    const results = await titles
      .find({ genres: genre })
      .sort({ rating: -1, updatedAt: -1 })
      .limit(30)
      .toArray();

    return NextResponse.json({
      success: true,
      genre,
      results: results.map((d) => toSafeResult(d as Record<string, unknown>))
    });
  } catch (err) {
    console.error("Genres API Error:", err);
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
  }
}
