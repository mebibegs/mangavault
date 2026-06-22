import { NextRequest } from "next/server";
import { verifyCsrfToken } from "./csrf";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  if (BASE_URL) origins.add(BASE_URL);
  // Allow localhost during development
  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");
  return origins;
}

export function isFromOwnOrigin(req: NextRequest): boolean {
  const allowed = getAllowedOrigins();
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (origin) return allowed.has(origin);
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  // No origin or referer — likely server-side or direct call
  // Allow for SSR / cron / health checks
  return false;
}

/**
 * Full private API guard — checks origin AND CSRF token.
 * Returns an error Response if rejected, or null if allowed.
 */
export function guardPrivateApi(req: NextRequest): Response | null {
  // Skip guard if no CSRF_SECRET configured (dev / build time)
  if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET.length < 64) {
    return null;
  }

  if (!isFromOwnOrigin(req)) {
    return new Response("Forbidden", { status: 403 });
  }

  const csrfToken = req.headers.get("x-csrf-token") ?? req.nextUrl.searchParams.get("_csrf");
  if (!csrfToken) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!verifyCsrfToken(csrfToken)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
}
