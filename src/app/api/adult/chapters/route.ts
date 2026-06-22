import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface OmegaChapter {
  chapter_name: string;
  chapter_slug: string;
  index: number;
  created_at: string;
}

/**
 * Fetch chapters for an OmegaScans series.
 * GET /api/adult/chapters?slug=milf-hunting-in-another-world
 *
 * Flow:
 *   1. Call /series/{slug} to get numeric series ID
 *   2. Call /chapter/query?series_id={id} to get all chapters
 *   3. Cache chapters in MongoDB for next time
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  try {
    // Check MongoDB cache first
    const db = await getMongoDb();
    if (db) {
      const doc = await db.collection("titles").findOne(
        { url: `https://omegascans.org/series/${slug}` },
        { projection: { chapters: 1 } }
      );
      if (doc && Array.isArray(doc.chapters) && doc.chapters.length > 0) {
        return NextResponse.json({
          chapters: doc.chapters,
          count: doc.chapters.length,
          source: "cache",
        });
      }
    }

    // Fetch series detail to get numeric ID
    const seriesRes = await fetch(`https://api.omegascans.org/series/${slug}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!seriesRes.ok) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }
    const seriesData = await seriesRes.json();
    const seriesId = seriesData.id;
    if (!seriesId) {
      return NextResponse.json({ error: "No series ID" }, { status: 404 });
    }

    // Fetch all chapters
    const chapRes = await fetch(
      `https://api.omegascans.org/chapter/query?page=1&perPage=500&series_id=${seriesId}`,
      { headers: { "User-Agent": UA, Accept: "application/json" } }
    );
    if (!chapRes.ok) {
      return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 502 });
    }
    const chapData = await chapRes.json();

    const chapters = ((chapData.data || []) as OmegaChapter[]).map((ch) => ({
      title: ch.chapter_name || `Chapter ${ch.index}`,
      url: `https://omegascans.org/series/${slug}/${ch.chapter_slug}`,
      date: ch.created_at ? new Date(ch.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
    }));

    // Cache in MongoDB
    if (db && chapters.length > 0) {
      db.collection("titles").updateOne(
        { url: `https://omegascans.org/series/${slug}` },
        {
          $set: {
            chapters,
            chapterCount: String(chapters.length),
            updatedAt: new Date(),
          },
        }
      ).catch(() => {});
    }

    return NextResponse.json({
      chapters,
      count: chapters.length,
      source: "live",
    });
  } catch {
    return NextResponse.json({ error: "Failed to load chapters" }, { status: 500 });
  }
}
