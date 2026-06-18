import { NextResponse } from "next/server";

export async function GET() {
  const SEC_MSG = "Hidden — URLs are not exposed via the public API for security purposes.";
  const docs = {
    name: "MangaVault Search API",
    version: "1.0.0",
    baseUrl: "/api",
    note: "All source URLs, cover URLs, and chapter URLs are hidden in public API responses for security purposes.",
    endpoints: {
      "GET /api/search": {
        description:
          "Search for manga/manhwa across multiple sources in parallel. Results are deduplicated and ranked by relevance.",
        parameters: {
          q: {
            type: "string",
            required: true,
            description: "Search query (min 2 chars, max 100 chars)",
            example: "solo leveling",
          },
        },
        rateLimit: "15 requests per minute per IP",
        responses: {
          200: {
            description: "Successful search",
            body: {
              success: true,
              results: [
                {
                  title: "string",
                  description: "string",
                  rating: "string",
                  status: "string",
                  type: "string",
                  genres: ["string"],
                  chapters: [
                    { title: "string", url: SEC_MSG, date: "string" },
                  ],
                  chapterCount: "string",
                  coverUrl: SEC_MSG,
                  url: SEC_MSG,
                  source: "string",
                  author: "string",
                  artist: "string",
                },
              ],
              count: "number",
              query: "string",
            },
          },
          400: { description: "Bad request", body: { error: "string", message: "string" } },
          403: { description: "Access denied", body: { error: "string" } },
          429: { description: "Rate limit exceeded", body: { error: "string", retryAfter: "number" } },
          500: { description: "Internal server error", body: { error: "string" } },
        },
        example: {
          request: 'GET /api/search?q=solo+leveling',
        },
      },
      "GET /api/health": {
        description: "Health check. Returns { ok: true } when the service is running.",
        responses: { 200: { body: { ok: true } } },
      },
    },
    security: {
      urlProtection: "All source URLs, cover image URLs, and chapter URLs are replaced with a security notice in public API responses. URLs are only available within the MangaVault web interface.",
      rateLimiting: "15 requests per minute per IP address",
      botDetection: "Automated bot requests are detected and blocked",
      ipBlocking: "IPs are temporarily blocked for DDoS attempts or excessive abuse",
    },
  };

  return NextResponse.json(docs, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
