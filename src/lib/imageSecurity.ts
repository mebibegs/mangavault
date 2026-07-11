const DEFAULT_ALLOWED_IMAGE_DOMAINS = [
  "cdn.asurascans.com",
  "asurascans.com",
  "demonicscans.org",
  "scythescans.com",
  "webtoon-phinf.pstatic.net",
  "swebtoon-phinf.pstatic.net",
  "webtoons-static.pstatic.net",
  "phinf.pstatic.net",
  "webtoons.com",
  "cdn.webtoons.com",
  "cdnwebtoons.com",
  "pstatic.net",
  "img-r2.2xstorage.com",
  "imgs-2.2xstorage.com",
  "2xstorage.com",
  "manganato.gg",
  "s1.manganato.gg",
  "s2.manganato.gg",
  "atsu.moe",
  "cdn.atsu.moe",
  "omegascans.org",
  "media.omegascans.org",
  "mangareadon.org",
  "librarydm.com",
  "demoniclibs.com",
  "manhuatop.org",
  "wp.com",
  "i0.wp.com",
  "i1.wp.com",
  "i2.wp.com",
  "i3.wp.com",
  "wp.com.cdn.cloudflare.net",
];

export const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

const ALLOWED_IMAGE_DOMAINS: ReadonlySet<string> = new Set([
  ...DEFAULT_ALLOWED_IMAGE_DOMAINS,
  ...(process.env.ALLOWED_IMAGE_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean),
]);

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^\[::1\]$/,
  /^0\.0\.0\.0$/,
  /^169\.254\./,
  /^fc00:/i,
  /^\[fc00:/i,
  /^fe80:/i,
  /^\[fe80:/i,
  /\.internal$/i,
  /\.local$/i,
];

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

export function isBlockedImageHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isAllowedImageHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  for (const allowed of ALLOWED_IMAGE_DOMAINS) {
    if (normalized === allowed || normalized.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

export function parseAndValidateImageUrl(value: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (isBlockedImageHost(parsed.hostname)) return null;
  if (!isAllowedImageHost(parsed.hostname)) return null;

  return parsed;
}

export function getImageReferer(parsed: URL): string {
  const host = parsed.hostname.toLowerCase();

  if (host.includes("2xstorage.com") || host.includes("manganato.gg")) return "https://www.manganato.gg/";
  if (host.includes("pstatic.net") || host.includes("webtoons.com") || host.includes("cdnwebtoons.com")) return "https://www.webtoons.com/";
  if (host.includes("asurascans.com")) return "https://asurascans.com/";
  if (host.includes("mangareadon.org") || host.includes("librarydm.com") || host.includes("demoniclibs.com")) return "https://demonicscans.org/";
  if (host.includes("demonicscans.org")) return "https://demonicscans.org/";
  if (host.includes("scythescans.com")) return "https://scythescans.com/";
  if (host.includes("manhuatop.org") || host.includes("manhuatop.com")) return "https://manhuatop.org/";
  if (host.includes("atsu.moe")) return "https://atsu.moe/";
  if (host.includes("omegascans.org")) return "https://omegascans.org/";
  if (host.includes("wp.com")) {
    const originHost = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    if (originHost && originHost.includes(".")) return `https://${originHost}/`;
  }

  return `https://${parsed.hostname}/`;
}

export async function fetchValidatedImage(
  initialUrl: URL,
  initForUrl: (url: URL) => RequestInit,
  maxRedirects = 3
): Promise<Response> {
  let current = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const validated = parseAndValidateImageUrl(current.toString());
    if (!validated) {
      throw new Error("Blocked image URL");
    }

    const upstream = await fetch(validated.toString(), {
      ...initForUrl(validated),
      redirect: "manual",
    });

    if (![301, 302, 303, 307, 308].includes(upstream.status)) {
      return upstream;
    }

    if (hop === maxRedirects) {
      throw new Error("Too many image redirects");
    }

    const location = upstream.headers.get("location");
    if (!location) {
      throw new Error("Image redirect missing Location header");
    }

    current = new URL(location, validated);
  }

  throw new Error("Too many image redirects");
}
