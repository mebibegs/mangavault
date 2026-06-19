import { NextRequest, NextResponse } from "next/server";
import { browseCatalog, searchAllSources } from "@/lib/scraper";
import type { MangaResult } from "@/lib/scraper";

const MAX_BROWSE_PAGE = 17;
const BATCH_SIZE = 4;

function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeGenreText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getGenreQueryVariants(genre: string): string[] {
  const variants = new Set<string>();
  const base = genre.trim();
  const normalized = normalizeGenreText(base);
  const withoutParentheses = base.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const dashed = base.replace(/\s+/g, "-");
  const spaced = base.replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim();

  [base, normalized, withoutParentheses, dashed, spaced].forEach((v) => {
    if (v && v.length >= 2) variants.add(v);
  });

  const aliasMap: Record<string, string[]> = {
    "sci fi": ["science fiction", "scifi", "sci-fi"],
    "science fiction": ["sci fi", "scifi", "sci-fi"],
    "op mc": ["overpowered", "overpowered protagonist", "strongest"],
    "overpowered protagonist op mc": ["overpowered", "op mc", "strongest"],
    murim: ["martial arts", "wuxia", "cultivation"],
    wuxia: ["murim", "martial arts", "xianxia"],
    xianxia: ["cultivation", "wuxia", "murim"],
    cultivation: ["xianxia", "wuxia", "murim"],
    isekai: ["another world", "reincarnation", "transmigration"],
    reincarnation: ["isekai", "regression", "transmigration"],
    regression: ["reincarnation", "second chance", "time travel"],
    "slice of life": ["healing", "iyashikei", "daily life"],
    superhero: ["super power", "comic", "graphic novel"],
    horror: ["thriller", "psychological horror", "supernatural"],
    romance: ["romantic comedy", "romance fantasy", "love"],
  };

  for (const key of [base.toLowerCase(), normalized, withoutParentheses.toLowerCase()]) {
    for (const alias of aliasMap[key] || []) variants.add(alias);
  }

  return [...variants].filter((v) => v.length >= 2);
}

function matchesGenre(result: MangaResult, genreTerms: string[]): boolean {
  const description = normalizeGenreText(result.description);
  const type = normalizeGenreText(result.type);
  const genres = result.genres.map((g) => normalizeGenreText(g));

  return genreTerms.some((term) => {
    const t = normalizeGenreText(term);
    if (!t) return false;
    return (
      genres.some((g) => g.includes(t) || t.includes(g)) ||
      type.includes(t) ||
      description.includes(t)
    );
  });
}

function dedupeResults(results: MangaResult[]): MangaResult[] {
  const seen = new Set<string>();
  const unique: MangaResult[] = [];
  for (const r of results) {
    const key = normalizeTitleKey(r.title);
    if (key.length > 2 && !seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }
  return unique;
}

async function collectBrowseGenrePool(genreTerms: string[]): Promise<MangaResult[]> {
  const pool: MangaResult[] = [];

  // Full browse sweep for every genre request so the stronger logic applies globally.
  for (let start = 1; start <= MAX_BROWSE_PAGE; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, MAX_BROWSE_PAGE);
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const batch = await Promise.allSettled(pages.map((page) => browseCatalog(page)));
    for (const result of batch) {
      if (result.status === "fulfilled") pool.push(...result.value.results);
    }
  }

  return dedupeResults(pool).filter((r) => matchesGenre(r, genreTerms));
}

export async function GET(req: NextRequest) {
  const genre = req.nextUrl.searchParams.get("q");

  if (!genre || genre.trim().length < 2) {
    return NextResponse.json(
      { error: "Bad Request", message: "Query parameter 'q' is required (min 2 chars)." },
      { status: 400 }
    );
  }

  const genreTerm = genre.trim();
  const genreTerms = getGenreQueryVariants(genreTerm);

  try {
    const [browsePool, ...searchPools] = await Promise.all([
      collectBrowseGenrePool(genreTerms),
      ...genreTerms.slice(0, 4).map((term) => searchAllSources(term).catch(() => [])),
    ]);

    const unique = dedupeResults([browsePool, ...searchPools].flat());
    const matched = unique.filter((r) => matchesGenre(r, genreTerms));
    const finalResults = matched.length >= 3 ? matched : unique;

    return NextResponse.json({
      success: true,
      genre: genreTerm,
      variants: genreTerms,
      results: finalResults,
      count: finalResults.length,
      targetReached: finalResults.length >= 100,
    });
  } catch {
    return NextResponse.json({ error: "Failed to search genre" }, { status: 500 });
  }
}
