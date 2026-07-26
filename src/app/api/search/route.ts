import { NextRequest, NextResponse } from "next/server";
import { getMongoDb, ensureTextIndex } from "@/lib/mongodb";
import { searchAllSources } from "@/lib/scraper";
import { upsertResults } from "@/lib/sync";
import { toSafeResult, isAdultContent } from "@/lib/safeResult";
import { checkRateLimit } from "@/lib/rate-limiter";
import { logRequest } from "@/lib/logger";
import { getCachedSearch, setCachedSearch, trackQueryFrequency } from "@/lib/cache";
import { coalesceSearch } from "@/lib/coalesce";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

function sanitizeQuery(q: string): string {
  return q
    .normalize("NFC")
    .replace(/\0/g, "")
    .replace(/[<>"'`;{}()[\]\\/]/g, "")
    .replace(/[\u0001-\u001F\u007F]/g, "")
    .trim()
    .substring(0, 100);
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const rateCheck = await checkRateLimit(ip);
    if (rateCheck.blocked || rateCheck.limited) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateCheck.retryAfter },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      );
    }

    const rawQuery = req.nextUrl.searchParams.get("q");
    if (!rawQuery || rawQuery.trim().length === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "Query parameter 'q' is required." },
        { status: 400 }
      );
    }
    const query = sanitizeQuery(rawQuery);
    if (query.length < 2) {
      return NextResponse.json(
        { error: "Bad Request", message: "Query must be at least 2 characters." },
        { status: 400 }
      );
    }

    // Reject queries that look like injection attempts
    if (/['";`]|--|OR\s|AND\s|\$\{|%00/i.test(query)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid query characters." },
        { status: 400 }
      );
    }

    // Track query frequency for cache pre-warming (async, non-blocking)
    trackQueryFrequency(query).catch(() => {});

    // ──────────────────────────────────────────────────────────────────
    // L1/L2: Check multi-tier cache first
    // ──────────────────────────────────────────────────────────────────
    const cached = await getCachedSearch(query);
    if (cached && cached.length > 0) {
      const filtered = cached.filter((d) => !isAdultContent(d.genres || []));
      logRequest({ ipAddress: ip, endpoint: "/api/search", method: "GET", statusCode: 200, query });
      return NextResponse.json({
        success: true,
        results: filtered.map((d) => toSafeResult(d as unknown as Record<string, unknown>)),
        count: filtered.length,
        query,
        source: "cache",
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // L3: MongoDB text search
    // ──────────────────────────────────────────────────────────────────
    const db = await getMongoDb();
    if (db) {
      const titles = db.collection("titles");
      const total = await titles.countDocuments();
      if (total > 0) {
        // Build the regex fallback once (used when $text is unavailable or
        // returns too few results). Escape special regex chars.
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const runRegexFallback = () =>
          titles
            .find({
              $or: [{ title: regex }, { description: regex }, { genres: regex }],
            })
            .limit(50)
            .maxTimeMS(8000)
            .toArray();

        // $text search REQUIRES a text index. If the index is missing the
        // query throws `IndexNotFound (code 27)`. Catch that, kick off an
        // index creation so future searches are fast, and use the regex
        // fallback for this request instead of returning a 500.
        let results: Array<Record<string, unknown>> = [];
        let usedTextSearch = false;
        try {
          results = await titles
            .find(
              { $text: { $search: query } },
              { projection: { score: { $meta: "textScore" } } }
            )
            .sort({ score: { $meta: "textScore" } })
            .limit(50)
            .maxTimeMS(8000)
            .toArray();
          usedTextSearch = true;
        } catch (textErr) {
          const msg = textErr instanceof Error ? textErr.message : String(textErr);
          console.warn("[Search] $text query failed, using regex fallback:", msg);
          // Self-heal: create the text index for next time (best-effort).
          ensureTextIndex().catch(() => {});
          results = await runRegexFallback();
        }

        if (usedTextSearch && results.length < 3) {
          results = await runRegexFallback();
        }

        if (results.length > 0) {
          const filtered = results.filter((d) => !isAdultContent((d.genres as string[]) || []));
          const mapped = filtered.map((d) => toSafeResult(d as Record<string, unknown>));
          // Populate cache for future requests
          setCachedSearch(query, filtered as unknown as Parameters<typeof setCachedSearch>[1]).catch(() => {});

          logRequest({ ipAddress: ip, endpoint: "/api/search", method: "GET", statusCode: 200, query });
          return NextResponse.json({
            success: true,
            results: mapped,
            count: filtered.length,
            query,
            source: "mongodb",
          });
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────
    // L4: Live scrape with request coalescing
    // Prevents thundering herd — identical concurrent requests share one scrape
    // ──────────────────────────────────────────────────────────────────
    const results = await coalesceSearch(query, async () => {
      const scraped = await searchAllSources(query);
      // Background: upsert to MongoDB for future caching
      if (scraped.length > 0) {
        upsertResults(scraped).catch(() => {});
      }
      return scraped;
    });

    // Filter adult content from results
    const filtered = results.filter((r) => !isAdultContent(r.genres || []));

    // Populate cache
    if (filtered.length > 0) {
      setCachedSearch(query, filtered).catch(() => {});
    }

    logRequest({ ipAddress: ip, endpoint: "/api/search", method: "GET", statusCode: 200, query });

    return NextResponse.json({
      success: true,
      results: filtered.map((r) => toSafeResult(r as unknown as Record<string, unknown>)),
      count: filtered.length,
      query,
      source: "live",
    });
  } catch (err) {
    console.error("Search API error:", err);
    logRequest({ ipAddress: ip, endpoint: "/api/search", method: "GET", statusCode: 500, errorMessage: "Internal error" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
