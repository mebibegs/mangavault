/**
 * CSP violation report endpoint (Issue 10).
 * Logs violations so broken third-party integrations are caught early.
 */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("application/csp-report")) {
    return new Response(null, { status: 204 });
  }

  try {
    const report = await req.json();
    console.error("[CSP Violation]", JSON.stringify(report));
  } catch {
    // Malformed report body — ignore
  }
  return new Response(null, { status: 204 });
}
