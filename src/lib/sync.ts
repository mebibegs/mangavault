import { getMongoDb } from "./mongodb";
import { browseCatalog, fetchMangaByUrl, searchAllSources } from "./scraper";
import type { MangaResult } from "./scraper";

/**
 * Normalize title for comparison - remove special chars, lower case
 */
function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Normalize romanization variants: Bungou→Bungo, Houshii→Hoshi, etc.
 * Strips common Japanese romanization extras so variant spellings match.
 */
function normalizeRomanization(title: string): string {
  return title
    .toLowerCase()
    // Remove parenthetical suffixes like (15-nen), (EN), (JP), (Completed)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    // Romanization normalization
    .replace(/ou/g, "o")         // Bungou→Bungo
    .replace(/uu/g, "u")         // Houshii→Houshi
    .replace(/ou/g, "o")
    .replace(/aa/g, "a")
    .replace(/ee/g, "e")
    .replace(/oo/g, "o")
    // Strip subtitle after colon/dash (Thiendavis: The Road → Thiendavis)
    .replace(/[:\-–—]\s+.*$/, "")
    .replace(/\s+for\s+the\s+/g, " ")
    .replace(/\s+to\s+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance between two strings (for close variant matching)
 */
function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 3) return Math.max(la, lb); // early exit
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[la][lb];
}

/**
 * Better fuzzy matching for similar titles.
 * Handles romanization variants, transliterations, pluralization,
 * Japanese/English title pairs, and subtitle differences.
 */
function fuzzyTitleMatch(a: string, b: string): boolean {
  const normA = normalizeTitleKey(a);
  const normB = normalizeTitleKey(b);

  if (normA === normB) return true;

  // 1. Romanization-aware comparison
  const romanA = normalizeRomanization(a).replace(/\s+/g, "");
  const romanB = normalizeRomanization(b).replace(/\s+/g, "");
  if (romanA === romanB) return true;

  // Levenshtein on romanized forms (catches Bungo/Bungou, etc.)
  if (Math.abs(romanA.length - romanB.length) <= 3 && romanA.length > 3) {
    const dist = levenshtein(romanA, romanB);
    const maxLen = Math.max(romanA.length, romanB.length);
    if (dist <= Math.max(1, Math.floor(maxLen * 0.15))) return true; // ≤15% edit distance
  }

  // 2. Containment: shorter is prefix/suffix of longer
  if (normA.length > 6 && normB.length > 6) {
    if (normA.startsWith(normB) || normB.startsWith(normA)) {
      return true;
    }
    if (normA.includes(normB) || normB.includes(normA)) {
      const ratio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
      if (ratio >= 0.7) return true;
    }
  }

  // 3. Word-level overlap
  const wordsA = a.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
  const wordsB = b.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
  if (wordsA.length >= 2 && wordsB.length >= 2) {
    const shared = wordsA.filter(w => wordsB.includes(w)).length;
    const minCount = Math.min(wordsA.length, wordsB.length);
    if (shared / minCount >= 0.7 && shared >= 2) return true;
  }

  // 4. Levenshtein on full normalized strings (catches Kawai/Kawari typo)
  if (Math.abs(normA.length - normB.length) <= 3 && normA.length > 5) {
    const dist = levenshtein(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);
    if (dist <= Math.max(1, Math.floor(maxLen * 0.2))) return true; // ≤20% edit distance
  }

  return false;
}

function chapterKey(chapter: { title?: string; url?: string }): string {
  const title = chapter.title || "";
  const number = title.match(/(?:chapter|ch\.?|episode|ep\.?)\s*([\d.]+)/i)?.[1]
    || chapter.url?.match(/(?:chapter|episode)[-_/]([\d.]+)/i)?.[1];
  if (number) return `n:${number}`;
  return `u:${chapter.url || title.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

function dedupeChapterList<T extends { title?: string; url?: string }>(chapters: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const chapter of chapters) {
    const key = chapterKey(chapter);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chapter);
  }
  return out;
}

export interface SyncStats {
  inserted: number;
  updated: number;
  total: number;
  durationMs: number;
}

/**
 * Upsert a batch of scraped results into MongoDB.
 * Uses insertMany for new docs and individual updateOne for existing.
 */
export async function upsertResults(results: MangaResult[]): Promise<{ inserted: number; updated: number }> {
  const db = await getMongoDb();
  if (!db) return { inserted: 0, updated: 0 };

  const titles = db.collection("titles");
  let inserted = 0;
  let updated = 0;

  // Deduplicate within this batch using fuzzy matching
  const batchMap = new Map<string, MangaResult>();
  for (const r of results) {
    const key = normalizeTitleKey(r.title);
    if (key.length < 3) continue;
    
    // Check for fuzzy matches in existing batch
    let existingKey: string | null = null;
    for (const [k] of batchMap) {
      if (fuzzyTitleMatch(k, key)) {
        existingKey = k;
        break;
      }
    }
    
    if (!existingKey) {
      batchMap.set(key, r);
    } else {
      const existing = batchMap.get(existingKey)!;
      const existingChapterCount = existing.chapters.length;
      const incomingChapterCount = r.chapters.length;

      for (const g of r.genres) {
        if (!existing.genres.includes(g)) existing.genres.push(g);
      }

      if (incomingChapterCount > 0) {
        const mergedChapters = dedupeChapterList([...existing.chapters, ...r.chapters]);
        existing.chapters = mergedChapters;
      }

      if (incomingChapterCount > existingChapterCount) {
        batchMap.set(existingKey, {
          ...r,
          genres: [...new Set([...existing.genres, ...r.genres])],
          chapters: dedupeChapterList([...existing.chapters, ...r.chapters]),
        });
      }
    }
  }

  const uniqueEntries = [...batchMap.entries()];

  // Process in chunks of 200
  for (let i = 0; i < uniqueEntries.length; i += 200) {
    const chunk = uniqueEntries.slice(i, i + 200);
    const keys = chunk.map(([k]) => k);

    // Find which already exist
    const existingDocs = await titles
      .find({ titleKey: { $in: keys } }, { projection: { titleKey: 1, chapters: 1, genres: 1, coverUrl: 1, description: 1, chapterCount: 1, sources: 1, rating: 1, status: 1 } })
      .toArray();
    const existingMap = new Map(existingDocs.map((d) => [d.titleKey as string, d]));

    // Separate new vs existing
    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: Array<{ titleKey: string; r: MangaResult; existing: Record<string, unknown> }> = [];

    for (const [titleKey, r] of chunk) {
      const existing = existingMap.get(titleKey);
      if (!existing) {
        // Derive publishedAt from the most recent chapter date
        const latestDate = r.chapters
          .map(ch => ch.date)
          .filter(d => d && d.length >= 8)
          .sort()
          .pop() || "";

        const dedupedChapters = dedupeChapterList(r.chapters);
        toInsert.push({
          titleKey,
          title: r.title,
          description: r.description || "No description available.",
          rating: r.rating,
          status: r.status,
          type: r.type,
          genres: r.genres,
          author: r.author,
          artist: r.artist,
          coverUrl: r.coverUrl,
          url: r.url,
          source: r.source,
          chapters: dedupedChapters.map((ch) => ({ title: ch.title, url: ch.url, date: ch.date })),
          chapterCount: String(dedupedChapters.length),
          sources: [{ name: r.source, url: r.url, lastSeen: new Date() }],
          publishedAt: latestDate || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        toUpdate.push({ titleKey, r, existing });
      }
    }

    // Bulk insert new docs
    if (toInsert.length > 0) {
      try {
        const result = await titles.insertMany(toInsert, { ordered: false });
        inserted += result.insertedCount;
      } catch (err: unknown) {
        // Count partial inserts from duplicate key errors
        if (err && typeof err === "object" && "insertedCount" in err) {
          inserted += (err as { insertedCount: number }).insertedCount;
        }
      }
    }

    // Update existing docs
    for (const { titleKey, r, existing } of toUpdate) {
      try {
        const setFields: Record<string, unknown> = { updatedAt: new Date() };

        if (r.rating !== "N/A" && r.rating !== existing.rating) setFields.rating = r.rating;
        if (r.status && r.status !== "Unknown" && r.status !== existing.status) setFields.status = r.status;
        if (r.coverUrl && (!existing.coverUrl || (existing.coverUrl as string).length < 5)) setFields.coverUrl = r.coverUrl;
        if (r.description && r.description !== "No description available." && r.description.length > ((existing.description as string) || "").length) setFields.description = r.description;

        const mergedGenres = [...new Set([...((existing.genres as string[]) || []), ...r.genres])];
        setFields.genres = mergedGenres;

        const existingSources: { name: string; url: string; lastSeen: Date }[] = (existing.sources as { name: string; url: string; lastSeen: Date }[]) || [];
        const existingSourceEntry = existingSources.find((s) => s.name === r.source);
        if (!existingSourceEntry) {
          existingSources.push({ name: r.source, url: r.url, lastSeen: new Date() });
        } else {
          existingSourceEntry.lastSeen = new Date();
          // If the stored source URL is empty or different, prefer the fresh scraped URL.
          if (!existingSourceEntry.url || existingSourceEntry.url !== r.url) {
            existingSourceEntry.url = r.url;
          }
        }
        setFields.sources = existingSources;

        const existingChapterKeys = new Set(((existing.chapters as { title?: string; url?: string }[]) || []).map(chapterKey));
        const newChapters = dedupeChapterList(r.chapters).filter((ch) => !existingChapterKeys.has(chapterKey(ch)));

        // Always reconcile chapterCount to actual array length to prevent drift
        const existingChapterCount = ((existing.chapters as unknown[]) || []).length;
        const totalChapterCount = existingChapterCount + newChapters.length;
        setFields.chapterCount = String(totalChapterCount);

        const update: Record<string, unknown> = { $set: setFields };
        if (newChapters.length > 0) {
          update.$push = { chapters: { $each: newChapters.map((ch) => ({ title: ch.title, url: ch.url, date: ch.date })) } };
        }

        await titles.updateOne({ titleKey }, update);
        updated++;
      } catch {
        // Skip individual update errors
      }
    }
  }

  return { inserted, updated };
}

/**
 * Search sync: search a specific query, upsert results.
 */
export async function searchAndSync(query: string): Promise<void> {
  const results = await searchAllSources(query);
  if (results.length > 0) {
    await upsertResults(results);
  }
}

/**
 * Rating backfill: picks titles with "N/A" ratings from the DB,
 * fetches their detail pages via fetchMangaByUrl, and updates ratings.
 *
 * @param limit — how many titles to process per run (default 100)
 */
export async function backfillRatings(limit = 100): Promise<{ processed: number; updated: number; durationMs: number }> {
  const start = Date.now();
  const db = await getMongoDb();
  if (!db) return { processed: 0, updated: 0, durationMs: 0 };

  const col = db.collection("titles");

  // Get titles with N/A rating that have a valid URL
  const naive = await col
    .find({ rating: "N/A", url: { $exists: true, $ne: "" } })
    .sort({ updatedAt: 1 })
    .limit(limit)
    .toArray();

  if (naive.length === 0) return { processed: 0, updated: 0, durationMs: Date.now() - start };

  let processed = 0;
  let updated = 0;

  // Process in batches of 5
  for (let i = 0; i < naive.length; i += 5) {
    const batch = naive.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (doc) => {
        try {
          const byUrl = await fetchMangaByUrl(doc.url as string, doc.title as string);
          if (byUrl && byUrl.rating !== "N/A") {
            await col.updateOne(
              { _id: doc._id },
              { $set: { rating: byUrl.rating, updatedAt: new Date() } }
            );
            return true;
          }
        } catch { /* */ }
        return false;
      })
    );
    for (const r of results) {
      processed++;
      if (r.status === "fulfilled" && r.value) updated++;
    }
  }

  return { processed, updated, durationMs: Date.now() - start };
}

/**
 * Chapter refresh: picks the oldest-refreshed titles from the DB,
 * fetches their detail/list pages from the original source,
 * and merges any new chapters back into the DB.
 *
 * @param limit — how many titles to refresh per run (default 50)
 */
export async function refreshChapters(limit = 50): Promise<{ refreshed: number; newChapters: number; newTitles: number; ratingsBackfilled: number; durationMs: number }> {
  const start = Date.now();
  const db = await getMongoDb();
  if (!db) return { refreshed: 0, newChapters: 0, newTitles: 0, ratingsBackfilled: 0, durationMs: 0 };

  const col = db.collection("titles");

  // Get the oldest-refreshed titles that have a valid URL
  const stale = await col
    .find({ url: { $exists: true, $ne: "" } })
    .sort({ updatedAt: 1 })
    .limit(limit)
    .toArray();

  let refreshed = 0;
  let newChapters = 0;

  // Process in batches of 5 to limit concurrent fetches
  for (let i = 0; i < stale.length; i += 5) {
    const batch = stale.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (doc) => {
        const url = doc.url as string;
        try {
          const byUrl = await fetchMangaByUrl(url, doc.title as string);
          if (byUrl) return byUrl;

          const res = await searchAllSources(doc.title as string);
          const key = normalizeTitleKey(doc.title as string);
          const match = res.find((r) => normalizeTitleKey(r.title) === key);
          return match || null;
        } catch {
          return null;
        }
      })
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status !== "fulfilled" || !result.value) continue;

      const r = result.value;
      const doc = batch[j];
      const existingChapterKeys = new Set(
        ((doc.chapters as { title?: string; url?: string }[]) || []).map(chapterKey)
      );
      const freshChapters = dedupeChapterList(r.chapters).filter((ch) => !existingChapterKeys.has(chapterKey(ch)));

      const setFields: Record<string, unknown> = { updatedAt: new Date() };

      // Update metadata if scraper has better data
      if (r.rating !== "N/A" && r.rating !== doc.rating) setFields.rating = r.rating;
      if (r.status && r.status !== "Unknown") setFields.status = r.status;
      if (r.coverUrl && (!doc.coverUrl || (doc.coverUrl as string).length < 5)) {
        setFields.coverUrl = r.coverUrl;
      }
      if (r.description && r.description !== "No description available." && r.description.length > ((doc.description as string) || "").length) {
        setFields.description = r.description;
      }

      // Merge genres
      const mergedGenres = [...new Set([...((doc.genres as string[]) || []), ...r.genres])];
      if (mergedGenres.length > ((doc.genres as string[]) || []).length) {
        setFields.genres = mergedGenres;
      }

      // Always reconcile chapterCount to actual array length to prevent drift
      const docChapterCount = ((doc.chapters as unknown[]) || []).length;
      const totalChapterCount = docChapterCount + freshChapters.length;
      setFields.chapterCount = String(totalChapterCount);

      const update: Record<string, unknown> = { $set: setFields };
      if (freshChapters.length > 0) {
        update.$push = {
          chapters: {
            $each: freshChapters.map((ch) => ({
              title: ch.title,
              url: ch.url,
              date: ch.date,
            })),
          },
        };
        newChapters += freshChapters.length;
      }

      await col.updateOne({ _id: doc._id }, update);
      refreshed++;
    }
  }

  // Also check for brand-new titles via quick browse
  const browseResults = await Promise.allSettled([
    browseCatalog(1),
    browseCatalog(2),
  ]);
  const browseBatch: MangaResult[] = [];
  for (const r of browseResults) {
    if (r.status === "fulfilled") browseBatch.push(...r.value.results);
  }
  const browseStats = browseBatch.length > 0 ? await upsertResults(browseBatch) : { inserted: 0 };

  // Also backfill ratings for titles that still have N/A
  const ratingStats = await backfillRatings(50);

  return {
    refreshed,
    newChapters,
    newTitles: browseStats.inserted,
    ratingsBackfilled: ratingStats.updated,
    durationMs: Date.now() - start,
  };
}
