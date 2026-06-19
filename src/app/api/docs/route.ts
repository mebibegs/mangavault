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
        description: "Returns trending titles aggregated across all connected sources, paginated at 30 results per page.",
        parameters: {
          page: { type: "number", required: false, description: "Page number (1–17)", example: 1 },
        },
      },
      "GET /api/reader": {
        description: "Fetches a chapter page, extracts only manga panel images, and returns them as a JSON array of image URLs.",
        parameters: {
          url: { type: "string", required: true, description: "Chapter URL from a supported source" },
        },
      },
      "GET /api/health": {
        description: "Health check. Returns { ok: true } when the service is running.",
      },
    },
  };

  return NextResponse.json(docs, { status: 200, headers: { "Cache-Control": "public, max-age=3600" } });
}
