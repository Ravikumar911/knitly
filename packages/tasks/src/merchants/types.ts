import { z } from "zod";
import { EmailData } from "../types/finwiseAI";

// Schema type constraint
export type MerchantSchemaType = 'base' | 'swiggy' | 'phonepe';

// Merchant configuration interface with better typing
export interface MerchantConfig {
  id: MerchantSchemaType;
  name: string;
  code: string; // Unique merchant code
  
  // Email identification patterns
  emailPatterns: string[]; // Email domains or patterns to match
  subjectPatterns?: string[]; // Subject line patterns
  bodyPatterns?: string[]; // Body content patterns
  
  // Schema and prompt configuration
  schema: z.ZodSchema<any>;
  prompt: string;
  
  // Priority for matching (higher = more specific)
  priority: number;
  
  // Active status
  isActive: boolean;
}

// Merchant detection result with better typing
export interface MerchantMatch {
  merchant: MerchantConfig;
  matchScore: number; // 0-100 confidence score
  matchedPatterns: {
    email?: string[];
    subject?: string[];
    body?: string[];
  };
}

// Merchant identification function type
export type MerchantIdentifier = (emailData: EmailData) => Promise<MerchantMatch | null>;

// Generic extraction result with better typing
export interface MerchantExtractionResult<T = any> {
  data: T;
  merchantId: string;
  merchantCode: string;
  extractionConfidence: number;
  schemaUsed: MerchantSchemaType;
  schemaValidation: {
    success: boolean;
    errors?: string[];
  };
} 