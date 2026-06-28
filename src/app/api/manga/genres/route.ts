/**
 * Manga Genres API
 * 
 * GET /api/manga/genres
 * Returns list of all genres
 * 
 * GET /api/manga/genres?genre=Action
 * Returns manga for a specific genre
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllGenres, getMangaByGenre } from "@/lib/manga-db";
import type { MangaDocument } from "@/lib/types/manga";
import { getSafeDisplayGenres } from "@/lib/genre-normalizer";

export const dynamic = "force-dynamic";

// Transform document for API response
function transformForResponse(doc: MangaDocument) {
  return {
    id: doc._id?.toString(),
    slug: doc.slug,
    title: doc.title,
    description: doc.description?.slice(0, 200),
    authors: doc.authors,
    status: doc.status,
    type: doc.type,
    genres: doc.genres,
    coverUrl: doc.images.cover,
    rating: doc.stats.rating,
    totalChapters: doc.totalChapters,
    isRestricted: doc.contentClassification.isRestricted,
    sources: doc.sources.map(s => s.name),
    updatedAt: doc.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const genre = searchParams.get("genre");

    // If genre specified, return manga for that genre
    if (genre) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
      const includeRestricted = searchParams.get("includeRestricted") === "true";

      const result = await getMangaByGenre(genre, page, limit, includeRestricted);

      return NextResponse.json({
        genre,
        results: result.results.map(transformForResponse),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });
    }

    // Otherwise, return list of all genres
    const allGenres = await getAllGenres();
    
    // Split into safe and restricted
    const safeGenres = getSafeDisplayGenres(allGenres);
    
    return NextResponse.json({
      genres: safeGenres,
      total: safeGenres.length,
    });

  } catch (err) {
    console.error("[API] Genres error:", err);
    return NextResponse.json(
      { error: "Failed to get genres", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
