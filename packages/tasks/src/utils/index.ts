export * from "./emailStorage";

import { getMerchantEmailConfigs } from "../merchants";

/**
 * Build a Gmail/IMAP search query from the active merchant registry.
 * This makes adding new food delivery (or other) merchants automatically
 * affect what emails are fetched, without touching multiple hardcoded strings.
 */
export function buildMerchantBasedGmailSearchQuery(days: number = 365): string {
  const configs = getMerchantEmailConfigs();
  const domains = new Set<string>();

  for (const cfg of configs) {
    for (const raw of cfg.domains) {
      if (!raw) continue;
      // Normalize: strip leading "*." and "@" prefixes for Gmail from:() syntax
      const cleaned = raw.replace(/^\*\./, "").replace(/^@/, "");
      if (cleaned) domains.add(cleaned);
    }
  }

  // Fallback to a minimal safe set if registry is empty (should not happen)
  const domainList = domains.size > 0
    ? Array.from(domains)
    : ["swiggy.in", "swiggy.com", "uber.com", "ubereats.com", "doordash.com"];

  const fromPart = domainList.join(" OR ");
  return `from:(${fromPart}) newer_than:${days}d`;
}
