import { createHash } from "crypto";

// Simple console-based logging (Vercel captures these in their logs)
// PRIVACY: Never log raw search queries — hash them for debugging only

export function logRequest(params: {
  ipAddress: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  query?: string;
  errorMessage?: string;
}) {
  const timestamp = new Date().toISOString();

  // Hash the query if provided — never log raw search terms
  let queryHash: string | undefined;
  if (params.query) {
    queryHash = createHash("sha256").update(params.query).digest("hex").slice(0, 8);
  }

  const logEntry = {
    timestamp,
    ip: params.ipAddress,
    method: params.method,
    endpoint: params.endpoint,
    status: params.statusCode,
    qh: queryHash,
    error: params.errorMessage,
  };

  if (params.errorMessage || (params.statusCode && params.statusCode >= 400)) {
    console.warn("[API]", JSON.stringify(logEntry));
  } else {
    console.log("[API]", JSON.stringify(logEntry));
  }
}

export function logBlockedIp(ip: string, reason: string) {
  console.warn("[BLOCKED]", JSON.stringify({
    timestamp: new Date().toISOString(),
    ip,
    reason,
  }));
}
