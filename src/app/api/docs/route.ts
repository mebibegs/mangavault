import { NextResponse } from "next/server";

export async function GET() {
  const docs = {
    name: "MangaVault Search API",
    version: "1.0.0",
    baseUrl: "/api",
    endpoints: {
      "GET /api/search": {
        description: "Search for manga/manhwa across multiple sources in parallel",
        parameters: {
          q: {
            type: "string",
            required: true,
            description: "Search query (min 2 chars, max 100 chars)",
            example: "solo leveling",
          },
        },
        headers: {
          "Content-Type": "application/json",
        },
        rateLimit: {
          limit: "10 requests per minute per IP",
          headers: {
            "X-RateLimit-Remaining": "Remaining requests in current window",
            "X-RateLimit-Reset": "Seconds until rate limit resets",
            "Retry-After": "Seconds to wait (only on 429 response)",
          },
        },
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
                    {
                      title: "string",
                      url: "string",
                      date: "string",
                    },
                  ],
                  chapterCount: "string",
                  coverUrl: "string",
                  url: "string",
                  source: "string",
                  author: "string",
                  artist: "string",
                },
              ],
              count: "number",
              query: "string",
            },
          },
          400: {
            description: "Bad request - missing or invalid query",
            body: { error: "string" },
          },
          403: {
            description: "Access denied - IP blocked or bot detected",
            body: { error: "Access denied." },
          },
          429: {
            description: "Rate limit exceeded",
            body: {
              error: "Rate limit exceeded. Please try again later.",
              retryAfter: "number (seconds)",
            },
          },
          500: {
            description: "Internal server error",
            body: {
              error: "An error occurred while processing your request.",
            },
          },
        },
        example: {
          request: "GET /api/search?q=solo+leveling",
          curl: 'curl -X GET "https://yourdomain.com/api/search?q=solo+leveling"',
        },
      },
      "GET /api/health": {
        description: "Health check endpoint",
        responses: {
          200: { body: { status: "ok" } },
        },
      },
      "GET /api/docs": {
        description: "This documentation endpoint",
      },
    },
    security: {
      rateLimiting: "10 requests/minute per IP address",
      botDetection: "Automated bot requests are blocked",
      ipBlocking:
        "IPs are automatically blocked for DDoS attempts, bot activity, or excessive abuse",
      inputSanitization:
        "All query inputs are sanitized to prevent injection attacks",
      timeoutProtection: "All external requests have a 12-second timeout",
      logging:
        "All requests are logged with IP, endpoint, timestamp, and errors",
      monitoring:
        "Sudden spikes and unusual patterns are automatically detected",
    },
  };

  return NextResponse.json(docs, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
