import { EmailExtractionPattern, getEmailExtractionPatterns } from "@workspace/database";
import { EmailData } from "../types/finwiseAI";
import { logger } from "@trigger.dev/sdk/v3";

export interface TemplateMatch {
  template: EmailExtractionPattern;
  matchScore: number; // 0-100 based on specificity
  matchedFields: ('email' | 'subject' | 'body')[];
}

export interface TemplateConfig {
  promptTemplate?: {
    systemOverride?: string;
    extractionFocus?: string[];
    categoryHint?: string;
    specialInstructions?: string;
  };
  fieldMappings?: Record<string, string>;
  validation?: {
    requiredFields?: string[];
    amountRange?: { min: number; max: number };
  };
}

export interface PromptComponents {
  systemPrompt: string;
  merchantInstructions?: string;
  extractionFocus?: string[];
  validationRules?: string;
  emailContent: string;
  attachmentContext?: string;
}

// Template caching for performance
const templateCache = new Map<string, EmailExtractionPattern[]>();

/**
 * Get cached email extraction patterns to avoid repeated DB queries
 */
async function getCachedTemplates(): Promise<EmailExtractionPattern[]> {
  const cacheKey = 'active_templates';
  
  if (!templateCache.has(cacheKey)) {
    const templates = await getEmailExtractionPatterns();
    templateCache.set(cacheKey, templates);
    
    // Cache invalidation after 5 minutes
    setTimeout(() => templateCache.delete(cacheKey), 5 * 60 * 1000);
  }
  
  return templateCache.get(cacheKey)!;
}

/**
 * Match a string against a pattern (supports basic regex)
 */
function matchPattern(text: string, pattern: string): boolean {
  try {
    // Handle both literal strings and regex patterns
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      // Regex pattern
      const regex = new RegExp(pattern.slice(1, -1), 'i');
      return regex.test(text);
    } else {
      // Simple string match (case-insensitive)
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  } catch (error) {
    logger.warn("Invalid pattern match", { pattern, error });
    return false;
  }
}

/**
 * Score how well a template matches the given email data
 */
function scoreTemplateMatch(emailData: EmailData, template: EmailExtractionPattern): TemplateMatch {
  let score = 0;
  const matchedFields: ('email' | 'subject' | 'body')[] = [];
  
  // Email pattern matching (highest weight)
  if (template.emailPattern && matchPattern(emailData.from, template.emailPattern)) {
    score += 50;
    matchedFields.push('email');
  }
  
  // Subject pattern matching (medium weight)  
  if (template.subjectPattern && matchPattern(emailData.subject, template.subjectPattern)) {
    score += 30;
    matchedFields.push('subject');
  }
  
  // Body pattern matching (lowest weight)
  if (template.bodyPattern && matchPattern(emailData.body, template.bodyPattern)) {
    score += 20;
    matchedFields.push('body');
  }
  
  // Priority bonus (max 10 points)
  score += Math.min((template.priority || 0) * 0.1, 10);
  
  return {
    template,
    matchScore: Math.min(score, 100), // Cap at 100
    matchedFields
  };
}

/**
 * Find the best matching template for the given email data
 */
export async function findBestMatchingTemplate(emailData: EmailData): Promise<TemplateMatch | null> {
  try {
    // Fetch all active templates once
    const templates = await getCachedTemplates();
    
    // Score and sort in memory (faster than multiple DB queries)
    const matches = templates
      .map(template => scoreTemplateMatch(emailData, template))
      .filter(match => match.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
    
    const bestMatch = matches[0] || null;
    
    if (bestMatch) {
      logger.log("Template matched", {
        templateId: bestMatch.template.id,
        score: bestMatch.matchScore,
        matchedFields: bestMatch.matchedFields,
        subject: emailData.subject
      });
    }
    
    return bestMatch;
  } catch (error) {
    logger.error("Error finding matching template", {
      error: error instanceof Error ? error.message : String(error),
      subject: emailData.subject
    });
    return null;
  }
}

/**
 * Parse template configuration from JSON string
 */
export function parseTemplateConfig(template: EmailExtractionPattern): TemplateConfig | null {
  if (!template.config) return null;
  
  try {
    return JSON.parse(template.config) as TemplateConfig;
  } catch (error) {
    logger.warn("Invalid template config JSON", {
      templateId: template.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Clear template cache (useful for testing or when templates are updated)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
} 