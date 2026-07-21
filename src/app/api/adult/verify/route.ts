import { NextRequest, NextResponse } from "next/server";
import { ADULT_COOKIE_MAX_AGE, ADULT_COOKIE_NAME, issueAdultCookieValue, verifyAdultCookieValue } from "@/lib/adultCookie";
import { guardPrivateApi } from "@/lib/originGuard";

export async function GET(req: NextRequest) {
  const verified = await verifyAdultCookieValue(req.cookies.get(ADULT_COOKIE_NAME)?.value);
  return NextResponse.json({ verified }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const guard = guardPrivateApi(req);
  if (guard) return guard;

  try {
    const token = await issueAdultCookieValue();
    const res = NextResponse.json({ success: true, verified: true });
    res.cookies.set(ADULT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADULT_COOKIE_MAX_AGE,
    });
    return res;
  } catch (error) {
    console.error("Adult verification failed:", error);
    return NextResponse.json({ error: "Adult verification is not configured" }, { status: 500 });
  }
}
