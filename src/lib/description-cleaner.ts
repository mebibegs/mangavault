/**
 * Description Cleaner
 * 
 * Cleans, formats, and sanitizes manga descriptions by:
 * - Removing HTML tags
 * - Removing advertisements and promotional text
 * - Fixing capitalization
 * - Trimming whitespace
 * - Removing broken formatting
 */

// ═══════════════════════════════════════════════════════════════════════════
// PATTERNS TO REMOVE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate promotional/advertisement content
 */
const PROMO_PATTERNS = [
  // Site promotions
  /read\s+(this\s+)?(?:manga|manhwa|manhua|webtoon|comic)\s+(?:at|on|from)\s+[\w.]+\s*\.?\s*(?:com|org|net|io)/gi,
  /(?:visit|check\s+out|go\s+to)\s+(?:our\s+)?(?:website|site)\s*:?\s*[\w.]+/gi,
  /(?:join|follow)\s+(?:us\s+)?(?:on|at)\s+(?:discord|twitter|instagram|facebook)/gi,
  /(?:support\s+us|donate)\s+(?:on|at)\s+(?:patreon|ko-?fi|paypal)/gi,
  
  // Update notifications
  /(?:new\s+chapters?\s+)?(?:every|updated?)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|day)/gi,
  /upload(?:ed|s)?\s+(?:every|on)\s+[\w\s]+/gi,
  
  // Copyright/scan group notices
  /(?:scanlated|translated|scanned)\s+by\s+[\w\s]+/gi,
  /(?:official|fan)\s+(?:translation|scanlation)/gi,
  /all\s+rights?\s+reserved?/gi,
  /copyright\s+©?\s*\d*/gi,
  
  // Social media handles
  /@[\w]+\s+(?:on\s+)?(?:twitter|instagram|discord)/gi,
  /(?:discord|twitter|instagram)\s*:\s*[\w@#]+/gi,
  
  // Generic promotions
  /(?:click|tap)\s+(?:here|below)\s+to/gi,
  /don'?t\s+forget\s+to\s+(?:like|subscribe|bookmark|follow)/gi,
  /(?:please\s+)?(?:rate|review|comment|bookmark)\s+(?:this|our)\s+(?:manga|manhwa|series)/gi,
  /if\s+you\s+(?:like|enjoy)\s+(?:this|our)\s+(?:work|translation)/gi,
  
  // Links
  /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
  /www\.[^\s<>"{}|\\^`\[\]]+/gi,
  
  // Broken HTML entities
  /&[a-z]+;/gi,
  /&#\d+;/gi,
];

/**
 * Phrases commonly found at the end that should be removed
 */
const TRAILING_PHRASES = [
  /\s*-+\s*$/,
  /\s*\.\.\.\s*$/,
  /\s*read\s+more\s*$/i,
  /\s*continue\s+reading\s*$/i,
  /\s*\[more\]\s*$/i,
  /\s*\(more\)\s*$/i,
  /\s*see\s+more\s*$/i,
];

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remove HTML tags from text
 */
function stripHtml(text: string): string {
  return text
    // Remove script and style content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Remove HTML tags
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    // Decode common entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&hellip;/gi, "...")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&lsquo;/gi, "'")
    .replace(/&rsquo;/gi, "'");
}

/**
 * Remove promotional content
 */
function removePromotionalContent(text: string): string {
  let result = text;
  
  for (const pattern of PROMO_PATTERNS) {
    result = result.replace(pattern, " ");
  }
  
  return result;
}

/**
 * Fix whitespace issues
 */
function normalizeWhitespace(text: string): string {
  return text
    // Replace multiple newlines with double newline
    .replace(/\n{3,}/g, "\n\n")
    // Replace multiple spaces with single space
    .replace(/[ \t]+/g, " ")
    // Trim whitespace around newlines
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Fix capitalization issues
 */
function fixCapitalization(text: string): string {
  // Don't modify if already looks properly formatted
  if (text.length === 0) return text;
  
  // If entire text is uppercase, convert to sentence case
  if (text === text.toUpperCase() && text.length > 20) {
    // Convert to lowercase first
    let result = text.toLowerCase();
    
    // Capitalize first letter of sentences
    result = result.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, char) => 
      prefix + char.toUpperCase()
    );
    
    return result;
  }
  
  // Ensure first character is capitalized
  if (/^[a-z]/.test(text)) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  
  return text;
}

/**
 * Remove trailing promotional phrases
 */
function removeTrailingPhrases(text: string): string {
  let result = text;
  
  for (const pattern of TRAILING_PHRASES) {
    result = result.replace(pattern, "");
  }
  
  return result.trim();
}

/**
 * Remove duplicate sentences/paragraphs
 */
function removeDuplicates(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const seen = new Set<string>();
  const unique: string[] = [];
  
  for (const para of paragraphs) {
    const normalized = para.toLowerCase().trim();
    if (normalized.length > 10 && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(para);
    } else if (normalized.length <= 10) {
      unique.push(para);
    }
  }
  
  return unique.join("\n\n");
}

/**
 * Remove common filler phrases that don't add value
 */
function removeFillerPhrases(text: string): string {
  return text
    .replace(/^(?:the\s+)?(?:story|synopsis|summary|plot)\s*(?:is|:|\s+)\s*/i, "")
    .replace(/^(?:this\s+is\s+)?(?:a\s+)?(?:story|tale)\s+(?:about|of)\s+/i, "")
    .replace(/^description\s*[:.\s]/i, "");
}

/**
 * Main function to clean a description
 */
export function cleanDescription(rawDescription: string | null | undefined): string {
  if (!rawDescription || typeof rawDescription !== "string") {
    return "";
  }
  
  let result = rawDescription;
  
  // Step 1: Strip HTML
  result = stripHtml(result);
  
  // Step 2: Remove promotional content
  result = removePromotionalContent(result);
  
  // Step 3: Normalize whitespace
  result = normalizeWhitespace(result);
  
  // Step 4: Remove filler phrases
  result = removeFillerPhrases(result);
  
  // Step 5: Fix capitalization
  result = fixCapitalization(result);
  
  // Step 6: Remove trailing phrases
  result = removeTrailingPhrases(result);
  
  // Step 7: Remove duplicates
  result = removeDuplicates(result);
  
  // Step 8: Final whitespace cleanup
  result = normalizeWhitespace(result);
  
  // Return null-ish value if result is too short or just whitespace
  if (result.length < 10) {
    return "";
  }
  
  return result;
}

/**
 * Truncate description to a maximum length while keeping complete sentences
 */
export function truncateDescription(text: string, maxLength: number = 500): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  // Find the last sentence boundary before maxLength
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastQuestion = truncated.lastIndexOf("?");
  const lastExclaim = truncated.lastIndexOf("!");
  
  const lastBoundary = Math.max(lastPeriod, lastQuestion, lastExclaim);
  
  if (lastBoundary > maxLength * 0.5) {
    return text.slice(0, lastBoundary + 1);
  }
  
  // Fall back to word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return text.slice(0, lastSpace) + "...";
  }
  
  return truncated + "...";
}

/**
 * Check if a description is valid (not empty or placeholder)
 */
export function isValidDescription(text: string | null | undefined): boolean {
  if (!text) return false;
  
  const cleaned = cleanDescription(text);
  if (cleaned.length < 20) return false;
  
  // Check for placeholder text
  const placeholders = [
    /^no\s+(?:description|synopsis|summary)\s*(?:available|yet)?\.?$/i,
    /^(?:description|synopsis|summary)\s+(?:coming|to\s+be\s+added)\.?$/i,
    /^n\/a$/i,
    /^tba$/i,
    /^tbd$/i,
    /^unknown$/i,
    /^\.{3,}$/,
  ];
  
  for (const pattern of placeholders) {
    if (pattern.test(cleaned)) {
      return false;
    }
  }
  
  return true;
}
