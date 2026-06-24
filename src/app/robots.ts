import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.mangavault.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/docs", "/genres", "/privacy", "/terms", "/dmca"],
        disallow: ["/api/", "/adult", "/_next/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
