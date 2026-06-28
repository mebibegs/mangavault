/**
 * Slug Generator and Search Data Utilities
 * 
 * Handles:
 * - Generating unique URL-safe slugs
 * - Creating searchable keywords
 * - Normalizing titles for deduplication
 */

// ═══════════════════════════════════════════════════════════════════════════
// SLUG GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  if (!title) return "";
  
  return title
    .toLowerCase()
    // Remove special characters but keep spaces and hyphens
    .replace(/[^\w\s-]/g, "")
    // Replace spaces with hyphens
    .replace(/\s+/g, "-")
    // Remove multiple consecutive hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "")
    // Limit length
    .slice(0, 100);
}

/**
 * Generate a unique slug by appending a suffix if needed
 */
export function generateUniqueSlug(title: string, existingSlugs: Set<string>): string {
  const baseSlug = generateSlug(title);
  
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }
  
  // Append numeric suffix
  let counter = 2;
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter++;
    if (counter > 1000) break; // Safety limit
  }
  
  return `${baseSlug}-${counter}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TITLE KEY GENERATION (for deduplication)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a normalized title key for deduplication
 * This removes all special characters and spaces, lowercases everything
 */
export function generateTitleKey(title: string): string {
  if (!title) return "";
  
  return title
    .toLowerCase()
    // Remove all non-alphanumeric characters
    .replace(/[^a-z0-9]/g, "")
    // Remove common prefixes/suffixes that vary between sources
    .replace(/^the/, "")
    .replace(/manga$/, "")
    .replace(/manhwa$/, "")
    .replace(/manhua$/, "")
    .replace(/webtoon$/, "")
    .replace(/novel$/, "")
    .replace(/comic$/, "");
}

/**
 * Generate alternative title keys for better matching
 */
export function generateAltTitleKeys(titles: string[]): string[] {
  if (!titles || !Array.isArray(titles)) return [];
  
  const keys = new Set<string>();
  
  for (const title of titles) {
    const key = generateTitleKey(title);
    if (key.length >= 3) {
      keys.add(key);
    }
  }
  
  return [...keys];
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH KEYWORD GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common words to exclude from keywords
 */
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
  "used", "this", "that", "these", "those", "i", "you", "he", "she", "it",
  "we", "they", "what", "which", "who", "whom", "whose", "where", "when",
  "how", "why", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same",
  "so", "than", "too", "very", "just", "also", "now", "here", "there",
]);

/**
 * Generate searchable keywords from text
 */
export function generateKeywords(text: string): string[] {
  if (!text) return [];
  
  const words = text
    .toLowerCase()
    // Split on non-alphanumeric characters
    .split(/[^a-z0-9]+/)
    // Filter out stop words and short words
    .filter(word => word.length >= 2 && !STOP_WORDS.has(word));
  
  return [...new Set(words)];
}

/**
 * Generate comprehensive search keywords from all titles
 */
export function generateSearchKeywords(
  title: string,
  altTitles: string[] = [],
  nativeTitle?: string | null
): string[] {
  const allKeywords = new Set<string>();
  
  // Add keywords from main title
  for (const keyword of generateKeywords(title)) {
    allKeywords.add(keyword);
  }
  
  // Add keywords from alt titles
  for (const altTitle of altTitles) {
    for (const keyword of generateKeywords(altTitle)) {
      allKeywords.add(keyword);
    }
  }
  
  // Add keywords from native title
  if (nativeTitle) {
    for (const keyword of generateKeywords(nativeTitle)) {
      allKeywords.add(keyword);
    }
  }
  
  // Add the full normalized titles as keywords too
  const titleKey = generateTitleKey(title);
  if (titleKey.length >= 3) {
    allKeywords.add(titleKey);
  }
  
  for (const altTitle of altTitles) {
    const altKey = generateTitleKey(altTitle);
    if (altKey.length >= 3) {
      allKeywords.add(altKey);
    }
  }
  
  return [...allKeywords];
}

// ═══════════════════════════════════════════════════════════════════════════
// TITLE SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate similarity between two title keys (0-1)
 * Uses a combination of exact matching and substring matching
 */
export function titleSimilarity(key1: string, key2: string): number {
  if (!key1 || !key2) return 0;
  
  // Exact match
  if (key1 === key2) return 1;
  
  // One is substring of other
  if (key1.includes(key2) || key2.includes(key1)) {
    const shorter = key1.length < key2.length ? key1 : key2;
    const longer = key1.length >= key2.length ? key1 : key2;
    return shorter.length / longer.length;
  }
  
  // Levenshtein-based similarity for close matches
  const distance = levenshteinDistance(key1, key2);
  const maxLen = Math.max(key1.length, key2.length);
  
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Check if two titles likely refer to the same manga
 */
export function titlesMatch(
  title1: string,
  altTitles1: string[],
  title2: string,
  altTitles2: string[]
): boolean {
  const key1 = generateTitleKey(title1);
  const key2 = generateTitleKey(title2);
  
  // Exact key match
  if (key1 === key2 && key1.length >= 3) {
    return true;
  }
  
  // Check alt titles
  const allKeys1 = [key1, ...generateAltTitleKeys(altTitles1)];
  const allKeys2 = [key2, ...generateAltTitleKeys(altTitles2)];
  
  for (const k1 of allKeys1) {
    for (const k2 of allKeys2) {
      if (k1 === k2 && k1.length >= 3) {
        return true;
      }
      // High similarity match (>0.9)
      if (k1.length >= 5 && k2.length >= 5 && titleSimilarity(k1, k2) > 0.9) {
        return true;
      }
    }
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMON ABBREVIATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate common abbreviations from a title
 */
export function generateAbbreviations(title: string): string[] {
  const abbreviations: string[] = [];
  
  // Get words
  const words = title.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length >= 2) {
    // First letter of each word
    const acronym = words.map(w => w[0]).join("").toLowerCase();
    if (acronym.length >= 2) {
      abbreviations.push(acronym);
    }
    
    // First letter of significant words (skip "the", "a", etc.)
    const significantWords = words.filter(w => 
      !STOP_WORDS.has(w.toLowerCase()) && w.length > 1
    );
    if (significantWords.length >= 2) {
      const sigAcronym = significantWords.map(w => w[0]).join("").toLowerCase();
      if (sigAcronym.length >= 2 && sigAcronym !== acronym) {
        abbreviations.push(sigAcronym);
      }
    }
  }
  
  return abbreviations;
}
