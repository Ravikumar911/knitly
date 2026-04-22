import { EmailData } from "../types/slashAI";
import { MerchantConfig, MerchantMatch } from "./types";

const logger = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

// Import merchant configurations
import SwiggyMerchant from "./swiggy";
// Add more merchants here as they are created
// import PhonePeMerchant from "./phonepe";
// import AmazonMerchant from "./amazon";

// Merchant registry - add new merchants here
export const MERCHANT_REGISTRY: MerchantConfig[] = [
  SwiggyMerchant,
  // PhonePeMerchant,
  // AmazonMerchant,
];

// Email filtering configuration interface (for email processing compatibility)
export interface MerchantEmailConfig {
  id: string;
  name: string;
  code: string;
  domains: string[];
  subjectPatterns: string[];
  bodyPatterns?: string[];
  isActive: boolean;
}

/**
 * Get merchant configurations for email filtering (replaces database getMerchantEmailConfigs)
 * This function extracts email filtering data from the codebase merchant registry
 */
export function getMerchantEmailConfigs(): MerchantEmailConfig[] {
  return MERCHANT_REGISTRY
    .filter(merchant => merchant.isActive)
    .map(merchant => ({
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      domains: extractDomainsFromEmailPatterns(merchant.emailPatterns),
      subjectPatterns: merchant.subjectPatterns || [],
      bodyPatterns: merchant.bodyPatterns || [],
      isActive: merchant.isActive
    }));
}

/**
 * Extract domain names from email patterns for Gmail search query building
 */
function extractDomainsFromEmailPatterns(emailPatterns: string[]): string[] {
  const domains: string[] = [];
  
  for (const pattern of emailPatterns) {
    // Extract domain from full email addresses
    if (pattern.includes('@')) {
      const domain = pattern.split('@')[1];
      if (domain && !domains.includes(domain)) {
        domains.push(domain);
      }
    } 
    // Handle direct domain patterns
    else if (pattern.includes('.') && !pattern.includes('/')) {
      if (!domains.includes(pattern)) {
        domains.push(pattern);
      }
    }
  }
  
  return domains;
}

/**
 * Get merchant configuration by ID (replaces database getMerchantById)
 */
export function getMerchantConfig(merchantId: string): MerchantEmailConfig | null {
  const merchant = MERCHANT_REGISTRY.find(m => m.id === merchantId && m.isActive);
  if (!merchant) {
    return null;
  }
  
  return {
    id: merchant.id,
    name: merchant.name,
    code: merchant.code,
    domains: extractDomainsFromEmailPatterns(merchant.emailPatterns),
    subjectPatterns: merchant.subjectPatterns || [],
    bodyPatterns: merchant.bodyPatterns || [],
    isActive: merchant.isActive
  };
}

/**
 * Get all active merchant configurations for email filtering
 */
export function getAllActiveMerchantConfigs(): MerchantEmailConfig[] {
  return getMerchantEmailConfigs();
}

/**
 * Match a pattern against text (supports regex and literal strings)
 */
function matchPattern(text: string, pattern: string): boolean {
  try {
    // Convert to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    
    // Check if pattern is a regex (starts and ends with /)
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      const regexPattern = pattern.slice(1, -1); // Remove / from start and end
      const regex = new RegExp(regexPattern, 'i'); // Case insensitive
      return regex.test(text);
    }
    
    // Simple string match
    return lowerText.includes(lowerPattern);
  } catch (error) {
    logger.warn("Pattern matching error", { pattern, error });
    return false;
  }
}

/**
 * Score how well a merchant matches the email data
 */
function scoreMerchantMatch(emailData: EmailData, merchant: MerchantConfig): MerchantMatch | null {
  let score = 0;
  const matchedPatterns: MerchantMatch['matchedPatterns'] = {};
  
  // Email pattern matching (highest weight - 50 points)
  const emailMatches = merchant.emailPatterns.filter(pattern => 
    matchPattern(emailData.from, pattern)
  );
  if (emailMatches.length > 0) {
    score += 50;
    matchedPatterns.email = emailMatches;
  }
  
  // Subject pattern matching (medium weight - 30 points)
  if (merchant.subjectPatterns) {
    const subjectMatches = merchant.subjectPatterns.filter(pattern =>
      matchPattern(emailData.subject, pattern)
    );
    if (subjectMatches.length > 0) {
      score += 30;
      matchedPatterns.subject = subjectMatches;
    }
  }
  
  // Body pattern matching (lowest weight - 20 points)
  if (merchant.bodyPatterns) {
    const bodyMatches = merchant.bodyPatterns.filter(pattern =>
      matchPattern(emailData.body, pattern)
    );
    if (bodyMatches.length > 0) {
      score += 20;
      matchedPatterns.body = bodyMatches;
    }
  }
  
  // Priority bonus (up to 10 points)
  score += Math.min(merchant.priority * 0.1, 10);
  
  // Return null if no meaningful match
  if (score < 30) { // Minimum threshold
    return null;
  }
  
  return {
    merchant,
    matchScore: Math.min(score, 100), // Cap at 100
    matchedPatterns
  };
}

/**
 * Identify the best matching merchant for an email
 */
export async function identifyMerchant(emailData: EmailData): Promise<MerchantMatch | null> {
  try {
    // Always return Swiggy as the merchant
    const swiggyMerchant = MERCHANT_REGISTRY.find(m => m.id === 'swiggy');
    
    if (!swiggyMerchant) {
      logger.error("Swiggy merchant not found in registry");
      return null;
    }

    const match: MerchantMatch = {
      merchant: swiggyMerchant,
      matchScore: 100,
      matchedPatterns: {
        email: swiggyMerchant.emailPatterns,
        subject: swiggyMerchant.subjectPatterns || [],
        body: swiggyMerchant.bodyPatterns || []
      }
    };

    logger.log("Merchant identified as Swiggy", {
      merchantId: match.merchant.id,
      merchantCode: match.merchant.code,
      score: match.matchScore,
      subject: emailData.subject,
      from: emailData.from
    });

    return match;
  } catch (error) {
    logger.error("Error identifying merchant", {
      error: error instanceof Error ? error.message : String(error),
      subject: emailData.subject,
      from: emailData.from
    });
    return null;
  }
}

/**
 * Get merchant by ID
 */
export function getMerchantById(merchantId: string): MerchantConfig | null {
  return MERCHANT_REGISTRY.find(m => m.id === merchantId) || null;
}

/**
 * Get merchant by code
 */
export function getMerchantByCode(merchantCode: string): MerchantConfig | null {
  return MERCHANT_REGISTRY.find(m => m.code === merchantCode) || null;
}

/**
 * Get all active merchants
 */
export function getActiveMerchants(): MerchantConfig[] {
  return MERCHANT_REGISTRY.filter(m => m.isActive);
}

/**
 * Add a new merchant to the registry (for dynamic loading)
 */
export function registerMerchant(merchant: MerchantConfig): void {
  // Check if merchant already exists
  const existingIndex = MERCHANT_REGISTRY.findIndex(m => m.id === merchant.id);
  
  if (existingIndex >= 0) {
    // Replace existing merchant
    MERCHANT_REGISTRY[existingIndex] = merchant;
    logger.log("Merchant updated in registry", { merchantId: merchant.id });
  } else {
    // Add new merchant
    MERCHANT_REGISTRY.push(merchant);
    logger.log("New merchant added to registry", { merchantId: merchant.id });
  }
} 
