/**
 * Trending Manga API
 * 
 * GET /api/manga/trending
 * 
 * Query params:
 * - limit: number of results (default: 20, max: 100)
 * - includeRestricted: "true" to include adult content
 */

import { NextRequest, NextResponse } from "next/server";
import { getTrendingManga, getRecentManga } from "@/lib/manga-db";
import type { MangaDocument } from "@/lib/types/manga";

export const dynamic = "force-dynamic";

// Transform document for API response
function transformForResponse(doc: MangaDocument) {
  return {
    id: doc._id?.toString(),
    slug: doc.slug,
    title: doc.title,
    altTitles: doc.altTitles,
    description: doc.description,
    authors: doc.authors,
    artists: doc.artists,
    status: doc.status,
    type: doc.type,
    genres: doc.genres,
    coverUrl: doc.images.cover,
    rating: doc.stats.rating,
    views: doc.stats.views,
    bookmarks: doc.stats.bookmarks,
    totalChapters: doc.totalChapters,
    latestChapter: doc.latestChapter,
    isRestricted: doc.contentClassification.isRestricted,
    sources: doc.sources.map(s => ({
      name: s.name,
      url: s.url,
    })),
    updatedAt: doc.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const includeRestricted = searchParams.get("includeRestricted") === "true";
    const sort = searchParams.get("sort") || "trending"; // "trending" or "recent"

    let results;
    if (sort === "recent") {
      results = await getRecentManga(limit, includeRestricted);
    } else {
      results = await getTrendingManga(limit, includeRestricted);
    }

    return NextResponse.json({
      results: results.map(transformForResponse),
      total: results.length,
      sort,
    });

  } catch (err) {
    console.error("[API] Trending error:", err);
    return NextResponse.json(
      { error: "Failed to get trending", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
