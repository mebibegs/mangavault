/**
 * Manga Detail API
 * 
 * GET /api/manga/[slug]
 * 
 * Returns full details for a manga by slug
 */

import { NextRequest, NextResponse } from "next/server";
import { findBySlug } from "@/lib/manga-db";
import type { MangaDocument } from "@/lib/types/manga";

export const dynamic = "force-dynamic";

// Transform document for API response (full details)
function transformForResponse(doc: MangaDocument) {
  return {
    id: doc._id?.toString(),
    slug: doc.slug,
    title: doc.title,
    altTitles: doc.altTitles,
    nativeTitle: doc.nativeTitle,
    description: doc.description,
    authors: doc.authors,
    artists: doc.artists,
    publisher: doc.publisher,
    serialization: doc.serialization,
    releaseYear: doc.releaseYear,
    status: doc.status,
    type: doc.type,
    country: doc.country,
    language: doc.language,
    genres: doc.genres,
    tags: doc.tags,
    demographic: doc.demographic,
    contentClassification: {
      rating: doc.contentClassification.rating,
      isRestricted: doc.contentClassification.isRestricted,
      readingDirection: doc.contentClassification.readingDirection,
    },
    chapters: doc.chapters.map(ch => ({
      number: ch.number,
      title: ch.title,
      url: ch.url,
      uploadDate: ch.uploadDate,
      volume: ch.volume,
      source: ch.source,
    })),
    totalChapters: doc.totalChapters,
    latestChapter: doc.latestChapter,
    images: {
      cover: doc.images.cover,
      banner: doc.images.banner,
      thumbnail: doc.images.thumbnail,
    },
    stats: {
      rating: doc.stats.rating,
      ratingCount: doc.stats.ratingCount,
      popularity: doc.stats.popularity,
      views: doc.stats.views,
      bookmarks: doc.stats.bookmarks,
    },
    relatedWorks: doc.relatedWorks,
    sources: doc.sources.map(s => ({
      name: s.name,
      url: s.url,
      lastScraped: s.lastScraped,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastScrapedAt: doc.lastScrapedAt,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    const manga = await findBySlug(slug);

    if (!manga) {
      return NextResponse.json(
        { error: "Manga not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(transformForResponse(manga));

  } catch (err) {
    console.error("[API] Manga detail error:", err);
    return NextResponse.json(
      { error: "Failed to get manga", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
