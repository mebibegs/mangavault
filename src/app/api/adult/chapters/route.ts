import { NextRequest, NextResponse } from "next/server";
import { MANGAVAULT_BROWSER } from "@/lib/userAgent";

interface OmegaSeries {
  id: number;
  series_slug: string;
}

interface OmegaChapter {
  chapter_name?: string;
  chapter_title?: string | null;
  chapter_slug?: string;
  created_at?: string;
  series?: { series_slug?: string };
}

const OMEGA_HEADERS = {
  "User-Agent": MANGAVAULT_BROWSER,
  Accept: "application/json",
  Referer: "https://omegascans.org/",
};

function chapterUrl(seriesSlug: string, chapterSlug: string): string {
  return `https://omegascans.org/series/${seriesSlug}/${chapterSlug}`;
}

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Missing or invalid slug" }, { status: 400 });
  }

  try {
    const seriesRes = await fetch(`https://api.omegascans.org/series/${encodeURIComponent(slug)}`, {
      headers: OMEGA_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!seriesRes.ok) {
      return NextResponse.json({ success: true, slug, chapters: [] });
    }

    const series = (await seriesRes.json()) as OmegaSeries;
    if (!series.id) return NextResponse.json({ success: true, slug, chapters: [] });

    const chaptersRes = await fetch(
      `https://api.omegascans.org/chapter/query?series_id=${series.id}&page=1&perPage=500`,
      {
        headers: OMEGA_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      }
    );

    if (!chaptersRes.ok) {
      return NextResponse.json({ success: true, slug, chapters: [] });
    }

    const payload = (await chaptersRes.json()) as { data?: OmegaChapter[] };
    const seriesSlug = series.series_slug || slug;
    const chapters = (payload.data || [])
      .filter((chapter) => chapter.chapter_slug)
      .map((chapter) => ({
        title: [chapter.chapter_name, chapter.chapter_title].filter(Boolean).join(" - ") || chapter.chapter_slug || "Chapter",
        url: chapterUrl(chapter.series?.series_slug || seriesSlug, chapter.chapter_slug || ""),
        date: chapter.created_at ? new Date(chapter.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
      }));

    return NextResponse.json({ success: true, slug, chapters });
  } catch (error) {
    console.error("Adult chapters error:", error);
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 502 });
  }
}
