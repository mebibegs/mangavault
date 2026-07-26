import { timingSafeEqual } from "crypto";
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

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;

  if (!safeEqual(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  // Pad shorter buffer to avoid leaking length via timing.
  // Use the longer length so both buffers are compared in full.
  const maxLen = Math.max(aBuffer.length, bBuffer.length);
  const aPadded = Buffer.alloc(maxLen, 0);
  const bPadded = Buffer.alloc(maxLen, 0);
  aBuffer.copy(aPadded);
  bBuffer.copy(bPadded);
  return timingSafeEqual(aPadded, bPadded) && aBuffer.length === bBuffer.length;
}
