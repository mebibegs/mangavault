import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Issue 1: Allow /api/img as a custom image loader
  images: {
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
    // Issue 2: Prevent Next.js from requesting 3840px-wide cover images.
    // These are the widths the <Image> component will choose from.
    // Covers are displayed at max ~300px (600px for 2x retina).
    deviceSizes: [320, 420, 640, 768, 1024, 1280],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return [
      // Issue 5: Short cache for HTML pages
      {
        source: "/((?!api|_next).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Issue 9/10: CSP that allows Cloudflare scripts + beacon
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Cloudflare Insights script + cdn-cgi scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://*.mangavault.in/cdn-cgi/scripts/ https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https: http:",
              // Cloudflare Turnstile iframes + cdn-cgi frames
              "frame-src 'self' https://challenges.cloudflare.com",
              // Cloudflare beacon endpoint (cdn-cgi/rum, cdn-cgi/beacon)
              "worker-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "report-uri /api/csp-report",
            ].join("; "),
          },
        ],
      },
      // Issue 5: Cache for API image proxy
      {
        source: "/api/img",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
