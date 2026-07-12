import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";

const ADULT_GENRES = [
  "Adult",
  "Mature",
  "Smut",
  "Ecchi",
  "Erotica",
  "Hentai",
  "Pornographic",
  "Doujinshi",
  "Yaoi",
  "Yuri",
  "Boys Love",
  "Netorare",
  "SM BDSM",
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSourceSlug(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.hostname.includes("omegascans.org")) {
      const index = parts.indexOf("series");
      return index >= 0 ? parts[index + 1] || "" : parts.at(-1) || "";
    }
    return parts.at(-1) || "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "40", 10) || 40));
    const query = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
    const genre = (req.nextUrl.searchParams.get("genre") || "All").trim();

    const db = await getMongoDb();
    if (!db) return NextResponse.json({ success: true, results: [], total: 0, page, hasMore: false });

    const titles = db.collection("titles");

    const adultFilter = {
      $or: [
        { genres: { $in: ADULT_GENRES } },
        { source: { $regex: /demonic|omega/i } },
      ],
    };

    const filters: Record<string, unknown>[] = [adultFilter];

    if (genre && genre !== "All") {
      filters.push({ genres: { $regex: new RegExp(`^${escapeRegex(genre)}$`, "i") } });
    }

    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filters.push({
        $or: [
          { title: regex },
          { description: regex },
          { genres: regex },
          { author: regex },
          { artist: regex },
        ],
      });
    }

    const filter = filters.length === 1 ? filters[0] : { $and: filters };
    const total = await titles.countDocuments(filter);
    const docs = await titles
      .find(filter)
      .sort({ updatedAt: -1, rating: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      results: docs.map((doc) => {
        const safe = toSafeResult(doc as Record<string, unknown>);
        const url = (doc.url as string) || "";
        return {
          ...safe,
          omegaSlug: getSourceSlug(url),
          sourceSlug: getSourceSlug(url),
        };
      }),
      total,
      page,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error("Adult API Error:", err);
    return NextResponse.json({ error: "Failed to fetch adult titles" }, { status: 500 });
  }
}
