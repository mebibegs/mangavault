import { NextResponse } from "next/server";
import { issueCsrfToken, getOrCreateSessionSid, CSRF_SESSION_COOKIE, CSRF_SESSION_MAX_AGE } from "@/lib/csrf";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    // Extract or create session SID — binds the token to this session
    const existingSid = req.headers.get("cookie")?.match(new RegExp(`${CSRF_SESSION_COOKIE}=([a-f0-9]+)`))?.[1];
    const sid = getOrCreateSessionSid(existingSid);

    const token = issueCsrfToken(sid);

    const res = NextResponse.json(
      { token },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );

    // Set session cookie if this is a new session
    if (!existingSid || existingSid !== sid) {
      res.cookies.set(CSRF_SESSION_COOKIE, sid, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: CSRF_SESSION_MAX_AGE,
      });
    }

    return res;
  } catch (error) {
    console.error("CSRF token issuance failed");
    return NextResponse.json({ error: "CSRF is not configured" }, { status: 500 });
  }
}
