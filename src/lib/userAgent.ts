/**
 * Centralized User-Agent strings for all outbound HTTP requests.
 *
 * MangaVault uses two UA strategies:
 *  - MANGAVAULT_BOT: Identifies MangaVault to target sites for robots.txt
 *    compliance. Used by the scraper and reader for pages/APIs that don't
 *    check bot identities.
 *  - MANGAVAULT_BROWSER: A realistic browser UA used when target sites
 *    actively block bot UAs (image CDNs, some manga sources).
 */

export const MANGAVAULT_BOT =
  "MangaVault/1.0 (+https://www.mangavault.in; manga aggregator for personal use)";

export const MANGAVAULT_BROWSER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
