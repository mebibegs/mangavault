import { NextRequest, NextResponse } from "next/server";
import { scrapeAdultOmegaTitles, searchAdultOmega } from "@/lib/omega-scraper";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";

function proxyImageUrl(realUrl: string): string {
  if (!realUrl || realUrl.length < 5) return "";
  if (realUrl.startsWith("/api/")) return realUrl;
  if (!realUrl.startsWith("http")) return realUrl;
  return `/api/img?url=${encodeURIComponent(realUrl)}`;
}

function attachSlug(r: Record<string, unknown>): Record<string, unknown> {
  const url = (r.url as string) || "";
  const slug = url.includes("omegascans.org/series/")
    ? url.split("/series/")[1]?.split("/")[0] || ""
    : (r.title as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    ...r,
    coverUrl: r.coverUrl ? proxyImageUrl(r.coverUrl as string) : "",
    url: "",
    source: "",
    omegaSlug: slug,
  };
}

/**
 * Adult API — OmegaScans adult-genre content only.
 *
 * Reads from MongoDB first (fast), falls back to live API only if DB is empty.
 * This fixes the timeout issue that caused the page to show nothing.
 */
export async function GET(req: NextRequest) {
  const query     = req.nextUrl.searchParams.get("q") || "";
  const genre     = req.nextUrl.searchParams.get("genre") || "";
  const pageParam = req.nextUrl.searchParams.get("page") || "1";
  const page      = Math.max(1, parseInt(pageParam, 10) || 1);
  const limit     = 30;
  const skip      = (page - 1) * limit;

  // Regex matching any adult genre tag
  const ADULT_RE = /adult|doujinshi|ecchi|erotica|hentai|mature|netorare|pornographic|smut|bdsm|yuri|yaoi|boys.?love|office.?workers|full.?color/i;

  try {
    // ── 1. MongoDB cache ──────────────────────────────────────────────
    const db = await getMongoDb();
    if (db) {
      const col = db.collection("titles");
      const omegaTotal = await col.countDocuments({ source: "Omega Scans" });

      if (omegaTotal > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const andClauses: any[] = [
          { source: "Omega Scans" },
          { genres: { $elemMatch: { $regex: ADULT_RE } } },
        ];

        if (query) {
          andClauses.push({
            $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
            ],
          });
        }

        if (genre && genre !== "All") {
          andClauses.push({
            genres: { $elemMatch: { $regex: new RegExp(genre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") } },
          });
        }

        const filter = { $and: andClauses };
        const totalCount = await col.countDocuments(filter);

        if (totalCount > 0) {
          const docs = await col
            .find(filter, {
              projection: {
                title: 1, description: 1, rating: 1, status: 1, type: 1,
                genres: 1, chapterCount: 1, coverUrl: 1, url: 1,
                author: 1, artist: 1,
              },
            })
            .sort({ rating: -1, updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

          const results = docs.map((d) =>
            attachSlug(toSafeResult(d as Record<string, unknown>) as Record<string, unknown>)
          );

          return NextResponse.json({
            success: true,
            results,
            count: results.length,
            total: totalCount,
            page,
            hasMore: skip + limit < totalCount,
            source: "cache",
          });
        }
      }
    }

    // ── 2. Live fallback ──────────────────────────────────────────────
    const allResults = query
      ? await searchAdultOmega(query)
      : await scrapeAdultOmegaTitles();

    const filtered =
      genre && genre !== "All"
        ? allResults.filter((r) =>
            r.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase()))
          )
        : allResults;

    const pageResults = filtered.slice(skip, skip + limit);

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
      source: "live",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch adult content" },
      { status: 500 }
    );
  }
}
