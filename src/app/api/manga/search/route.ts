/**
 * Manga Search API
 * 
 * GET /api/manga/search
 * 
 * Query params:
 * - q: search query (required)
 * - page: page number (default: 1)
 * - limit: results per page (default: 20, max: 100)
 * - genres: comma-separated genre filter
 * - type: manga, manhwa, manhua, etc.
 * - status: ongoing, completed, hiatus, cancelled
 * - includeRestricted: "true" to include adult content
 */

import { NextRequest, NextResponse } from "next/server";
import { searchManga, type SearchOptions } from "@/lib/manga-db";
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
    
    const query = searchParams.get("q") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const genresParam = searchParams.get("genres");
    const type = searchParams.get("type") as MangaDocument["type"] | undefined;
    const status = searchParams.get("status") as MangaDocument["status"] | undefined;
    const includeRestricted = searchParams.get("includeRestricted") === "true";

    const genres = genresParam ? genresParam.split(",").filter(Boolean) : undefined;

    const options: SearchOptions = {
      query,
      page,
      limit,
      includeRestricted,
      genres,
      type: type || undefined,
      status: status || undefined,
    };

    const result = await searchManga(options);

    return NextResponse.json({
      results: result.results.map(transformForResponse),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      query,
    });

  } catch (err) {
    console.error("[API] Search error:", err);
    return NextResponse.json(
      { error: "Search failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
