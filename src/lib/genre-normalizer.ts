/**
 * Genre Normalization and Restricted Content Classification
 * 
 * This module handles:
 * 1. Normalizing genre names to consistent formats
 * 2. Identifying restricted/adult content
 * 3. Classifying content ratings
 */

// ═══════════════════════════════════════════════════════════════════════════
// GENRE NORMALIZATION MAP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map of raw genre strings to normalized display names
 * Keys are lowercase, values are properly capitalized
 */
const GENRE_NORMALIZATION: Record<string, string> = {
  // Action & Adventure
  "action": "Action",
  "adventure": "Adventure",
  "survival": "Survival",
  
  // Drama & Emotion
  "drama": "Drama",
  "tragedy": "Tragedy",
  "heartwarming": "Heartwarming",
  "emotional": "Drama",
  
  // Comedy & Slice of Life
  "comedy": "Comedy",
  "slice of life": "Slice of Life",
  "slice-of-life": "Slice of Life",
  "sliceoflife": "Slice of Life",
  "sol": "Slice of Life",
  "daily life": "Slice of Life",
  "everyday life": "Slice of Life",
  
  // Fantasy & Supernatural
  "fantasy": "Fantasy",
  "supernatural": "Supernatural",
  "magic": "Magic",
  "demons": "Demons",
  "monsters": "Monsters",
  "vampires": "Vampires",
  "ghosts": "Supernatural",
  
  // Sci-Fi & Mecha
  "sci-fi": "Science Fiction",
  "scifi": "Science Fiction",
  "science fiction": "Science Fiction",
  "mecha": "Mecha",
  "cyberpunk": "Cyberpunk",
  "space": "Space",
  "robots": "Mecha",
  
  // Romance
  "romance": "Romance",
  "love": "Romance",
  "romantic": "Romance",
  
  // Isekai & Reincarnation
  "isekai": "Isekai",
  "reincarnation": "Reincarnation",
  "transmigration": "Transmigration",
  "regression": "Regression",
  "second chance": "Second Chance",
  "transported": "Isekai",
  "another world": "Isekai",
  "time travel": "Time Travel",
  "time-travel": "Time Travel",
  "timetravel": "Time Travel",
  
  // Martial Arts & Power
  "martial arts": "Martial Arts",
  "martial-arts": "Martial Arts",
  "martialarts": "Martial Arts",
  "cultivation": "Cultivation",
  "super power": "Super Power",
  "super-power": "Super Power",
  "superpower": "Super Power",
  "superpowers": "Super Power",
  "wuxia": "Martial Arts",
  "murim": "Murim",
  
  // Mystery & Thriller
  "mystery": "Mystery",
  "thriller": "Thriller",
  "psychological": "Psychological",
  "suspense": "Thriller",
  "horror": "Horror",
  "dark": "Dark",
  
  // Historical & Period
  "historical": "Historical",
  "history": "Historical",
  "period": "Historical",
  "ancient": "Historical",
  "medieval": "Medieval",
  
  // School & Youth
  "school life": "School Life",
  "school-life": "School Life",
  "schoollife": "School Life",
  "school": "School Life",
  "high school": "School Life",
  "college": "College",
  "coming of age": "Coming of Age",
  
  // Sports & Games
  "sports": "Sports",
  "games": "Games",
  "gaming": "Gaming",
  "esports": "eSports",
  
  // Demographics
  "shounen": "Shounen",
  "shonen": "Shounen",
  "seinen": "Seinen",
  "shoujo": "Shoujo",
  "shojo": "Shoujo",
  "josei": "Josei",
  
  // Types
  "manga": "Manga",
  "manhwa": "Manhwa",
  "manhua": "Manhua",
  "webtoon": "Webtoon",
  "webtoons": "Webtoon",
  "long strip": "Long Strip",
  "full color": "Full Color",
  "adaptation": "Adaptation",
  "one shot": "One Shot",
  "oneshot": "One Shot",
  
  // Themes
  "villainess": "Villainess",
  "revenge": "Revenge",
  "system": "System",
  "dungeon": "Dungeon",
  "tower": "Tower",
  "hunter": "Hunter",
  "necromancer": "Necromancer",
  "returner": "Returner",
  "story regression": "Regression",
  "video game": "Video Game",
  "virtual reality": "Virtual Reality",
  "vr": "Virtual Reality",
  "game elements": "Game Elements",
  "leveling": "Leveling",
  "overpowered": "Overpowered",
  "op mc": "Overpowered MC",
  "weak to strong": "Weak to Strong",
  
  // Character Types
  "anti-hero": "Anti-Hero",
  "antihero": "Anti-Hero",
  "villain protagonist": "Villain Protagonist",
  "female protagonist": "Female Protagonist",
  "male protagonist": "Male Protagonist",
  "strong female lead": "Strong Female Lead",
  "strong male lead": "Strong Male Lead",
  
  // Other
  "gender bender": "Gender Bender",
  "genderbender": "Gender Bender",
  "military": "Military",
  "music": "Music",
  "cooking": "Cooking",
  "food": "Food",
  "medical": "Medical",
  "crime": "Crime",
  "police": "Police",
  "detective": "Detective",
  "family": "Family",
  "parenting": "Parenting",
  "animals": "Animals",
  "pets": "Pets",
  "award winning": "Award Winning",
  
  // Childhood
  "childhood friends": "Childhood Friends",
  "childhood": "Childhood Friends",
};

// ═══════════════════════════════════════════════════════════════════════════
// RESTRICTED GENRE MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map of restricted genres to their internal identifiers
 * These genres will flag content as restricted
 */
export const RESTRICTED_GENRE_MAP: Record<string, string> = {
  // Adult content
  "adult": "mature_content",
  "18+": "mature_content",
  "r18": "age_restricted",
  "r-18": "age_restricted",
  "age restricted": "age_restricted",
  
  // Boys Love / Yaoi
  "boys love": "bl",
  "boyslove": "bl",
  "bl": "bl",
  "yaoi": "bl",
  "soft yaoi": "bl",
  "shounen ai": "bl",
  "shounen-ai": "bl",
  "shonen ai": "bl",
  "shonen-ai": "bl",
  
  // Girls Love / Yuri
  "girls love": "gl",
  "girlslove": "gl",
  "gl": "gl",
  "yuri": "gl",
  "shoujo ai": "gl",
  "shoujo-ai": "gl",
  "shojo ai": "gl",
  "shojo-ai": "gl",
  
  // Suggestive content
  "ecchi": "suggestive",
  "fanservice": "suggestive",
  "fan service": "suggestive",
  
  // Explicit romance
  "smut": "explicit_romance",
  "erotica": "explicit_romance",
  "erotic": "explicit_romance",
  
  // Harem
  "harem": "multi_partner",
  "reverse harem": "reverse_multi_partner",
  "reverse-harem": "reverse_multi_partner",
  
  // Explicit adult
  "hentai": "explicit_adult",
  "pornographic": "explicit_material",
  "porn": "explicit_material",
  
  // Mature
  "mature": "mature",
  "gore": "mature",
  "violence": "mature",
  "graphic violence": "mature",
  
  // Doujinshi
  "doujinshi": "fan_derivative",
  "doujin": "fan_derivative",
  
  // Relationship themes
  "netorare": "relationship_betrayal",
  "ntr": "relationship_betrayal",
  "netori": "relationship_takeover",
  
  // BDSM
  "sm": "dominance_submission",
  "bdsm": "dominance_submission",
  "sm bdsm": "dominance_submission",
  "sm/bdsm": "dominance_submission",
  
  // Sensitive content
  "sexual violence": "sensitive_content",
  "rape": "sensitive_content",
  
  // Youthful themes (flagged for extra caution)
  "loli": "youthful_character_theme",
  "lolicon": "youthful_character_theme",
  "shota": "youthful_character_theme",
  "shotacon": "youthful_character_theme",
  
  // Workplace (often adult on certain sites)
  "office workers": "workplace",
  "office romance": "workplace",
  
  // Full Color (often adult on OmegaScans-like sites)
  "full color": "full_color",
};

// ═══════════════════════════════════════════════════════════════════════════
// RESTRICTED IDENTIFIER SET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * All identifiers that mark content as restricted
 */
export const RESTRICTED_IDENTIFIERS = new Set([
  "mature_content",
  "bl",
  "gl",
  "fan_derivative",
  "suggestive",
  "explicit_romance",
  "full_color",
  "multi_partner",
  "explicit_content",
  "explicit_adult",
  "youthful_character_theme",
  "mature",
  "relationship_betrayal",
  "relationship_takeover",
  "workplace",
  "explicit_material",
  "age_restricted",
  "sensitive_content",
  "dominance_submission",
  "reverse_multi_partner",
]);

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize a single genre string
 */
export function normalizeGenre(genre: string): string {
  if (!genre) return "";
  
  const cleaned = genre.toLowerCase().trim();
  
  // Check normalization map
  if (GENRE_NORMALIZATION[cleaned]) {
    return GENRE_NORMALIZATION[cleaned];
  }
  
  // Check restricted map (still return proper display name)
  if (RESTRICTED_GENRE_MAP[cleaned]) {
    // Capitalize first letter of each word
    return genre
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
  
  // Default: capitalize first letter of each word
  return genre
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalize and deduplicate a list of genres
 */
export function normalizeGenres(genres: string[]): string[] {
  if (!genres || !Array.isArray(genres)) return [];
  
  const normalized = new Set<string>();
  
  for (const genre of genres) {
    const norm = normalizeGenre(genre);
    if (norm && norm.length > 0) {
      normalized.add(norm);
    }
  }
  
  // Sort alphabetically
  return [...normalized].sort((a, b) => a.localeCompare(b));
}

/**
 * Get restricted identifiers for a list of genres
 */
export function getRestrictedIdentifiers(genres: string[]): string[] {
  if (!genres || !Array.isArray(genres)) return [];
  
  const identifiers = new Set<string>();
  
  for (const genre of genres) {
    const cleaned = genre.toLowerCase().trim();
    if (RESTRICTED_GENRE_MAP[cleaned]) {
      identifiers.add(RESTRICTED_GENRE_MAP[cleaned]);
    }
  }
  
  return [...identifiers];
}

/**
 * Check if content should be restricted based on genres
 */
export function isRestrictedContent(genres: string[]): boolean {
  const identifiers = getRestrictedIdentifiers(genres);
  return identifiers.length > 0;
}

/**
 * Determine content rating from genres
 */
export function getContentRating(genres: string[]): "safe" | "suggestive" | "mature" | "explicit" {
  const identifiers = new Set(getRestrictedIdentifiers(genres));
  
  // Explicit content
  if (
    identifiers.has("explicit_adult") ||
    identifiers.has("explicit_material") ||
    identifiers.has("explicit_content") ||
    identifiers.has("age_restricted") ||
    identifiers.has("sensitive_content")
  ) {
    return "explicit";
  }
  
  // Mature content
  if (
    identifiers.has("mature_content") ||
    identifiers.has("mature") ||
    identifiers.has("explicit_romance") ||
    identifiers.has("relationship_betrayal") ||
    identifiers.has("relationship_takeover") ||
    identifiers.has("dominance_submission") ||
    identifiers.has("youthful_character_theme")
  ) {
    return "mature";
  }
  
  // Suggestive content
  if (
    identifiers.has("suggestive") ||
    identifiers.has("bl") ||
    identifiers.has("gl") ||
    identifiers.has("multi_partner") ||
    identifiers.has("reverse_multi_partner") ||
    identifiers.has("fan_derivative") ||
    identifiers.has("full_color") ||
    identifiers.has("workplace")
  ) {
    return "suggestive";
  }
  
  return "safe";
}

/**
 * Filter out restricted genres from a list (for display on main site)
 */
export function filterRestrictedGenres(genres: string[]): string[] {
  return genres.filter(genre => {
    const cleaned = genre.toLowerCase().trim();
    return !RESTRICTED_GENRE_MAP[cleaned];
  });
}

/**
 * Get display-safe genres (excluding adult/restricted ones)
 */
export function getSafeDisplayGenres(genres: string[]): string[] {
  const normalized = normalizeGenres(genres);
  return filterRestrictedGenres(normalized);
}
