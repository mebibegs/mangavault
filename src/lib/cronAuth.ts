import { NextRequest, NextResponse } from "next/server";

/**
 * Authenticate a cron / external sync request using CRON_SECRET.
 *
 * Accepts:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Returns an error Response if rejected, or null if allowed.
 */
export function guardCronApi(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is not configured, allow (dev / build time)
  if (!cronSecret) return null;

  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
