import { NextResponse } from "next/server";

export async function GET() {
  const docs = {
    name: "MangaVault Search API",
    version: "1.0.0",
    baseUrl: "/api",
    endpoints: {
      "GET /api/search": {
        description: "Search for manga/manhwa/manhua/anime/donghua/webtoon across multiple sources in parallel.",
        parameters: {
          q: { type: "string", required: true, description: "Search query (min 2 chars, max 100 chars)", example: "solo leveling" },
        },
        rateLimit: "15 requests per minute per IP",
      },
      "GET /api/trending": {
        description: "Returns trending titles aggregated across connected sources, paginated at 30 results per page.",
        parameters: {
          page: { type: "number", required: false, description: "Page number", example: 1 },
        },
      },
      "GET /api/genres": {
        description: "Returns titles matching a genre from the synced MongoDB titles collection.",
        parameters: {
          q: { type: "string", required: true, description: "Genre name", example: "Action" },
          page: { type: "number", required: false, description: "Page number", example: 1 },
          limit: { type: "number", required: false, description: "Results per page, max 60", example: 30 },
        },
      },
      "GET /api/reader": {
        description: "Fetches a chapter page, extracts only manga panel images, and returns them as a JSON array of image URLs.",
        parameters: {
          url: { type: "string", required: true, description: "Chapter URL from a supported source" },
        },
      },
      "GET /api/adult": {
        description: "Returns adult-classified titles from the synced MongoDB titles collection with search, genre filtering, and pagination.",
        parameters: {
          q: { type: "string", required: false, description: "Optional title/description/genre/author/artist search query", example: "office" },
          genre: { type: "string", required: false, description: "Optional exact genre filter", example: "Mature" },
          page: { type: "number", required: false, description: "Page number", example: 1 },
          limit: { type: "number", required: false, description: "Results per page, max 60", example: 40 },
        },
      },
      "GET /api/adult/chapters": {
        description: "Fetches chapter metadata for an Omega Scans adult title by source slug.",
        parameters: {
          slug: { type: "string", required: true, description: "Omega Scans series slug", example: "example-series" },
        },
      },
      "GET /api/health": {
        description: "Health check. Returns { ok: true, database: 'mongodb' } when MongoDB responds, { ok: false, database: 'not_configured' } with 503 when MongoDB is not configured, or { ok: false, database: 'mongodb' } with 500 when ping fails.",
      },
    },
  };

  return NextResponse.json(docs, { status: 200, headers: { "Cache-Control": "public, max-age=3600" } });
}
