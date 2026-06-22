import { NextResponse } from "next/server";
import { issueCsrfToken } from "@/lib/csrf";

export async function GET(): Promise<NextResponse> {
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
}
