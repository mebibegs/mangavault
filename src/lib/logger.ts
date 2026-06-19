// Simple console-based logging (Vercel captures these in their logs)

export function logRequest(params: {
  ipAddress: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  query?: string;
  errorMessage?: string;
}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ip: params.ipAddress,
    method: params.method,
    endpoint: params.endpoint,
    status: params.statusCode,
    query: params.query,
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
