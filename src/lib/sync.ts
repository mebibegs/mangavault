import { getMongoDb } from "./mongodb";
import { browseCatalog, searchAllSources } from "./scraper";
import type { MangaResult } from "./scraper";
import { scrapeAllWebtoonGenres } from "./webtoon-genres";
import { scrapeAllAsuraGenres } from "./asura-genres";
import { scrapeAllDemonicTitles } from "./demonic-genres";
import { scrapeAllScytheGenres } from "./scythe-genres";

function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
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

  // Deduplicate within this batch
  const batchMap = new Map<string, MangaResult>();
  for (const r of results) {
    const key = normalizeTitleKey(r.title);
    if (key.length < 3) continue;
    if (!batchMap.has(key)) {
      batchMap.set(key, r);
    } else {
      const existing = batchMap.get(key)!;
      for (const g of r.genres) {
        if (!existing.genres.includes(g)) existing.genres.push(g);
      }
      if (r.chapters.length > existing.chapters.length) {
        const mergedGenres = [...existing.genres];
        batchMap.set(key, { ...r, genres: mergedGenres });
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
          chapterCount: r.chapterCount,
          chapters: r.chapters.map((ch) => ({ title: ch.title, url: ch.url, date: ch.date })),
          sources: [{ name: r.source, url: r.url, lastSeen: new Date() }],
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
        if (parseInt(r.chapterCount) > parseInt((existing.chapterCount as string) || "0")) setFields.chapterCount = r.chapterCount;

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

        const existingUrls = new Set(((existing.chapters as { url: string }[]) || []).map((c) => c.url));
        const newChapters = r.chapters.filter((ch) => !existingUrls.has(ch.url));

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
 * Full sync: scrape all browse pages from all sources and upsert into MongoDB.
 */
export async function fullSync(): Promise<SyncStats> {
  const start = Date.now();
  let inserted = 0;
  let updated = 0;

  for (let pageStart = 1; pageStart <= 17; pageStart += 4) {
    const pages = [];
    for (let p = pageStart; p <= Math.min(pageStart + 3, 17); p++) pages.push(p);

    const results = await Promise.allSettled(pages.map((p) => browseCatalog(p)));
    const batch: MangaResult[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") batch.push(...r.value.results);
    }
    if (batch.length > 0) {
      const stats = await upsertResults(batch);
      inserted += stats.inserted;
      updated += stats.updated;
    }
  }

  const db = await getMongoDb();
  const total = db ? await db.collection("titles").countDocuments() : 0;
  return { inserted, updated, total, durationMs: Date.now() - start };
}

/**
 * Quick sync: scrape pages 1-3 (latest updates) and upsert.
 */
export async function quickSync(): Promise<SyncStats> {
  const start = Date.now();
  let inserted = 0;
  let updated = 0;

  const results = await Promise.allSettled([browseCatalog(1), browseCatalog(2), browseCatalog(3)]);
  const batch: MangaResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") batch.push(...r.value.results);
  }
  if (batch.length > 0) {
    const stats = await upsertResults(batch);
    inserted += stats.inserted;
    updated += stats.updated;
  }

  const db = await getMongoDb();
  const total = db ? await db.collection("titles").countDocuments() : 0;
  return { inserted, updated, total, durationMs: Date.now() - start };
}

/**
 * Deep sync: full browse + ALL Webtoons genre pages.
 */
export async function deepSync(): Promise<SyncStats> {
  const start = Date.now();
  let inserted = 0;
  let updated = 0;

  // 1. Browse pages
  for (let pageStart = 1; pageStart <= 17; pageStart += 4) {
    const pages = [];
    for (let p = pageStart; p <= Math.min(pageStart + 3, 17); p++) pages.push(p);
    const results = await Promise.allSettled(pages.map((p) => browseCatalog(p)));
    const batch: MangaResult[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") batch.push(...r.value.results);
    }
    if (batch.length > 0) {
      const stats = await upsertResults(batch);
      inserted += stats.inserted;
      updated += stats.updated;
    }
  }

  // 2. ALL Webtoons genre pages
  const webtoonResults = await scrapeAllWebtoonGenres();
  if (webtoonResults.length > 0) {
    for (let i = 0; i < webtoonResults.length; i += 200) {
      const batch = webtoonResults.slice(i, i + 200);
      const stats = await upsertResults(batch);
      inserted += stats.inserted;
      updated += stats.updated;
    }
  }

  // 3. ALL Asura genre pages (with pagination)
  const asuraResults = await scrapeAllAsuraGenres();
  if (asuraResults.length > 0) {
    for (let i = 0; i < asuraResults.length; i += 200) {
      const batch = asuraResults.slice(i, i + 200);
      const stats = await upsertResults(batch);
      inserted += stats.inserted;
      updated += stats.updated;
    }
  }

  // 4. ALL Demonic Scans titles (paginated listing)
  const demonicResults = await scrapeAllDemonicTitles();
  if (demonicResults.length > 0) {
    for (let i = 0; i < demonicResults.length; i += 200) {
      const batch = demonicResults.slice(i, i + 200);
      const stats = await upsertResults(batch);
      inserted += stats.inserted;
      updated += stats.updated;
    }
  }

  // 5. ALL Scythe Scans genre pages
  const scytheResults = await scrapeAllScytheGenres();
  if (scytheResults.length > 0) {
    const stats = await upsertResults(scytheResults);
    inserted += stats.inserted;
    updated += stats.updated;
  }

  const db = await getMongoDb();
  const total = db ? await db.collection("titles").countDocuments() : 0;
  return { inserted, updated, total, durationMs: Date.now() - start };
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
 * Chapter refresh: picks the oldest-refreshed titles from the DB,
 * fetches their detail/list pages from the original source,
 * and merges any new chapters back into the DB.
 *
 * @param limit — how many titles to refresh per run (default 50)
 */
export async function refreshChapters(limit = 50): Promise<{ refreshed: number; newChapters: number; newTitles: number; durationMs: number }> {
  const start = Date.now();
  const db = await getMongoDb();
  if (!db) return { refreshed: 0, newChapters: 0, newTitles: 0, durationMs: 0 };

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
          const res = await searchAllSources(doc.title as string);
          // Find the result that best matches this doc
          const key = normalizeTitleKey(doc.title as string);
          const match = res.find(
            (r) => normalizeTitleKey(r.title) === key
          );
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
      const existingUrls = new Set(
        ((doc.chapters as { url: string }[]) || []).map((c) => c.url)
      );
      const freshChapters = r.chapters.filter((ch) => !existingUrls.has(ch.url));

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
      if (parseInt(r.chapterCount) > parseInt((doc.chapterCount as string) || "0")) {
        setFields.chapterCount = r.chapterCount;
      }

      // Merge genres
      const mergedGenres = [...new Set([...((doc.genres as string[]) || []), ...r.genres])];
      if (mergedGenres.length > ((doc.genres as string[]) || []).length) {
        setFields.genres = mergedGenres;
      }

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

  return {
    refreshed,
    newChapters,
    newTitles: browseStats.inserted,
    durationMs: Date.now() - start,
  };
}
