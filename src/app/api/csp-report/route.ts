/**
 * CSP violation report endpoint (Issue 10).
 * Logs violations so broken third-party integrations are caught early.
 */
export async function POST(req: Request) {
  try {
    const report = await req.json();
    console.error("[CSP Violation]", JSON.stringify(report));
  } catch {
    // Malformed report body — ignore
  }
  return new Response(null, { status: 204 });
}
