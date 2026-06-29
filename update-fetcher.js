const fs = require('fs');

let code = fs.readFileSync('src/lib/scrapers/registry.ts', 'utf8');

const smartFetcher = `
// --- CLOUDFLARE BYPASS FETCHER ---
const SCRAPINGANT_KEY = process.env.SCRAPINGANT_KEY || "";

async function smartFetch(url: string): Promise<Response> {
  const protectedDomains = ["mangafire.to", "flamecomics.xyz", "vortexscans.org", "mangago.me", "toongod.org", "webtoonscan.com", "mangavault.xyz"];
  const isProtected = protectedDomains.some(domain => url.includes(domain));

  if (isProtected && SCRAPINGANT_KEY) {
    // Route through ScrapingAnt to bypass Cloudflare Turnstile
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = "https://api.scrapingant.com/v2/general?url=" + encodedUrl + "&x-api-key=" + SCRAPINGANT_KEY + "&browser=true";
    console.log("[Bypass] Routing to Cloudflare Bypasser: " + url);
    return await fetch(apiUrl, { signal: AbortSignal.timeout(45000) }); 
  }

  return await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000)
  });
}
// ---------------------------------
`;

code = code.replace(/import \* as cheerio from "cheerio";/, 'import * as cheerio from "cheerio";\n' + smartFetcher);
code = code.replace(/await fetch\(/g, 'await smartFetch(');

fs.writeFileSync('src/lib/scrapers/registry.ts', code);
console.log("Updated registry.ts with Cloudflare bypass logic");
