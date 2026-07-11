import { NextResponse } from "next/server";
import { issueCsrfToken } from "@/lib/csrf";

export async function GET(): Promise<NextResponse> {
  try {
    const token = issueCsrfToken();
    return NextResponse.json(
      { token },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error("CSRF token issuance failed:", error);
    return NextResponse.json({ error: "CSRF is not configured" }, { status: 500 });
  }
}
