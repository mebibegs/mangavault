import { getMongoDb } from "@/lib/mongodb";
import { getRedis } from "@/lib/redisEnv";

export const dynamic = "force-dynamic";

export async function GET() {
  // Report which config the deployment can actually see (names only, never values)
  const redisSource = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? "upstash_env"
    : process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
      ? "vercel_kv_env"
      : "none";

  let redisOk = false;
  if (redisSource !== "none") {
    try {
      await getRedis()?.ping();
      redisOk = true;
    } catch { /* unreachable or bad credentials */ }
  }

  try {
    const db = await getMongoDb();
    if (!db) {
      return Response.json({ ok: false, database: "not_configured", redis: redisSource, redisOk }, { status: 503 });
    }

    await db.command({ ping: 1 });
    return Response.json({ ok: true, database: "mongodb", redis: redisSource, redisOk });
  } catch {
    return Response.json({ ok: false, database: "mongodb", redis: redisSource, redisOk }, { status: 500 });
  }
}
