import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getMongoDb();
    if (!db) {
      return Response.json({ ok: false, database: "not_configured" }, { status: 503 });
    }

    await db.command({ ping: 1 });
    return Response.json({ ok: true, database: "mongodb" });
  } catch {
    return Response.json({ ok: false, database: "mongodb" }, { status: 500 });
  }
}
