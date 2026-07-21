import { NextRequest } from "next/server";
import { verifyCsrfToken } from "./csrf";

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ? normalizeOrigin(process.env.NEXT_PUBLIC_BASE_URL) : "";

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  if (BASE_URL) origins.add(BASE_URL);
  return origins;
}

export function isFromOwnOrigin(req: NextRequest): boolean {
  const allowed = getAllowedOrigins();
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  const isAllowedOrigin = (value: string): boolean => {
    const normalized = normalizeOrigin(value);
    if (allowed.has(normalized)) return true;

    try {
      const parsed = new URL(normalized);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return true;
    } catch {
      // ignore invalid origins
    }

    return false;
  };

  if (origin) return isAllowedOrigin(origin);
  if (referer) {
    try {
      return isAllowedOrigin(new URL(referer).origin);
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
  if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET.length < 64) {
    if (process.env.NODE_ENV === "production") {
      return new Response("CSRF is not configured", { status: 500 });
    }
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
