import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { scrapeAllOmegaTitles, searchOmega } from "@/lib/omega-scraper";
import { upsertResults } from "@/lib/sync";
import { toSafeResult } from "@/lib/safeResult";

/** Adult results include the omega slug for chapter loading */
function toAdultResult(doc: Record<string, unknown>) {
  const safe = toSafeResult(doc);

  // Extract slug from the original URL or sources array
  let slug = "";

  // Try the raw URL first
  const rawUrl = (doc.url as string) || "";
  if (rawUrl.includes("omegascans.org/series/")) {
    slug = rawUrl.split("/series/")[1]?.split("/")[0] || "";
  }

  // If URL doesn't have omega slug, check sources array
  if (!slug) {
    const sources = (doc.sources as Array<{ name: string; url: string }>) || [];
    const omegaSource = sources.find((s) => s.name === "Source G");
    if (omegaSource?.url?.includes("omegascans.org/series/")) {
      slug = omegaSource.url.split("/series/")[1]?.split("/")[0] || "";
    }
  }

  // Last resort: derive slug from title
  if (!slug) {
    const title = (doc.title as string) || "";
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  return { ...safe, omegaSlug: slug };
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const genre = req.nextUrl.searchParams.get("genre") || "";
  const pageParam = req.nextUrl.searchParams.get("page") || "1";
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const limit = 30;
  const skip = (page - 1) * limit;

  try {
    const db = await getMongoDb();
    if (db) {
      const titles = db.collection("titles");
      const baseFilter: Record<string, unknown> = { "sources.name": "Source G" };

      if (query) {
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        baseFilter.$or = [{ title: regex }, { description: regex }, { genres: regex }];
      }
      if (genre) {
        const genreRegex = new RegExp(genre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        baseFilter.genres = genreRegex;
      }

      const total = await titles.countDocuments(baseFilter);
      if (total > 0) {
        const results = await titles
          .find(baseFilter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        return NextResponse.json({
          success: true,
          results: results.map((d) => toAdultResult(d as Record<string, unknown>)),
          count: results.length,
          total,
          page,
          hasMore: skip + results.length < total,
          source: "cache",
        });
      }
    }

    // Fallback: live scrape from OmegaScans API
    const results = query ? await searchOmega(query) : await scrapeAllOmegaTitles();
    if (results.length > 0) upsertResults(results).catch(() => {});

    const filtered = genre
      ? results.filter((r) => r.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase())))
      : results;

    return NextResponse.json({
      success: true,
      results: filtered.slice(skip, skip + limit).map((r) => toAdultResult(r as unknown as Record<string, unknown>)),
      count: Math.min(limit, filtered.length - skip),
      total: filtered.length,
      page,
      hasMore: skip + limit < filtered.length,
      source: "live",
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch adult content" }, { status: 500 });
  }
}
