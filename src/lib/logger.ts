import { db } from "@/db";
import { requestLogs, blockedIps } from "@/db/schema";

export async function logRequest(params: {
  ipAddress: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  query?: string;
  errorMessage?: string;
}) {
  // Skip logging if DATABASE_URL is not set (e.g., during build or if DB is optional)
  if (!process.env.DATABASE_URL) return;

  try {
    await db.insert(requestLogs).values({
      ipAddress: params.ipAddress,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode ?? null,
      query: params.query ?? null,
      errorMessage: params.errorMessage ?? null,
    });
  } catch {
    // Silent fail - don't crash the request over logging
    console.error("Failed to log request");
  }
}

export async function logBlockedIp(ip: string, reason: string, permanent = false) {
  // Skip logging if DATABASE_URL is not set
  if (!process.env.DATABASE_URL) return;

  try {
    await db
      .insert(blockedIps)
      .values({
        ipAddress: ip,
        reason,
        permanent,
        expiresAt: permanent ? null : new Date(Date.now() + 3600 * 1000),
      })
      .onConflictDoNothing();
  } catch {
    console.error("Failed to log blocked IP");
  }
}
