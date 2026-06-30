import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";

export async function GET(req: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) return NextResponse.json({ results: [] });

    const titles = db.collection("titles");
    
    // Find adult/mature titles (e.g. from Demonic Scans or containing Adult tags)
    const results = await titles
      .find({
        $or: [
          { genres: { $in: ["Adult", "Mature", "Smut", "Ecchi"] } },
          { source: { $regex: /demonic|omega/i } }
        ]
      })
      .sort({ updatedAt: -1 })
      .limit(40)
      .toArray();

    return NextResponse.json({
      success: true,
      results: results.map((d) => toSafeResult(d as Record<string, unknown>))
    });
  } catch (err) {
    console.error("Adult API Error:", err);
    return NextResponse.json({ error: "Failed to fetch adult titles" }, { status: 500 });
  }
}
