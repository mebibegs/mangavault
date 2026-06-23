export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCircuitBreakerStatus } from "@/lib/scraper-runner";

/**
 * Health check endpoint.
 * 
 * Public response: { status: "ok" }
 * With internal key: includes source circuit breaker status
 */
export async function GET(req: NextRequest) {
  const internalKey = req.headers.get("x-health-key");
  const expectedKey = process.env.HEALTH_SECRET;

  // Basic public health check
  if (!expectedKey || internalKey !== expectedKey) {
    return NextResponse.json({ status: "ok" });
  }

  // Internal detailed health check
  try {
    const circuitStatus = getCircuitBreakerStatus();
    const openCircuits = Object.entries(circuitStatus).filter(([, v]) => v.open);

    return NextResponse.json({
      status: openCircuits.length === 0 ? "ok" : "degraded",
      circuits: circuitStatus,
      openCount: openCircuits.length,
      ts: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
      ts: Date.now(),
    });
  }
}
