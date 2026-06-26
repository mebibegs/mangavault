import { NextRequest, NextResponse } from "next/server";
import { scrapeAdultOmegaTitles, searchAdultOmega } from "@/lib/omega-scraper";

/**
 * Build a proxy URL for /api/img
 */
function proxyImageUrl(realUrl: string): string {
  if (!realUrl || realUrl.length < 5) return "";
  if (realUrl.startsWith("/api/")) return realUrl;
  if (!realUrl.startsWith("http")) return realUrl;
  return `/api/img?url=${encodeURIComponent(realUrl)}`;
}

/**
 * Adult API — serves ONLY adult-tagged OmegaScans content.
 * Uses genre classification from omega-scraper to ensure only adult-genre
 * titles are served here; SFW titles are excluded.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const genre = req.nextUrl.searchParams.get("genre") || "";
  const pageParam = req.nextUrl.searchParams.get("page") || "1";
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const limit = 30;
  const skip = (page - 1) * limit;

  try {
    // Fetch only adult-classified titles
    const allResults = query
      ? await searchAdultOmega(query)
      : await scrapeAdultOmegaTitles();

    // Filter by genre if specified
    const filtered =
      genre && genre !== "All"
        ? allResults.filter((r) =>
            r.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase()))
          )
        : allResults;

    // Paginate
    const pageResults = filtered.slice(skip, skip + limit);

    // Transform: proxy cover images, extract slug
    const results = pageResults.map((r) => {
      const slug = r.url.includes("omegascans.org/series/")
        ? r.url.split("/series/")[1]?.split("/")[0] || ""
        : r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      return {
        title: r.title,
        description: r.description,
        rating: r.rating,
        status: r.status,
        type: r.type,
        genres: r.genres,
        chapters: [],
        chapterCount: r.chapterCount,
        coverUrl: r.coverUrl ? proxyImageUrl(r.coverUrl) : "",
        url: "",
        source: "",
        author: r.author,
        artist: r.artist,
        omegaSlug: slug,
      };
    });

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      total: filtered.length,
      page,
      hasMore: skip + limit < filtered.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch adult content" },
      { status: 500 }
    );
  }
}
