import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Issue 1: Allow /api/img as a custom image loader
  images: {
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://*.mangavault.in/cdn-cgi/scripts/",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https: http:",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
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
