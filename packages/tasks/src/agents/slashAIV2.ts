import { generateObject, NoObjectGeneratedError, LanguageModel } from "ai";
import { defaultModel, OCRModel } from "../ai/model";
import { createSignedStorageUrl } from "../utils/signedUrls";
import { logger } from "@trigger.dev/sdk/v3";
import { EmailData } from "../types/slashAI";
import { getMerchantById, identifyMerchant } from "../merchants";
import { MerchantConfig } from "../merchants/types";
import { storeTransactionV2Input } from "@workspace/database";
import { z } from "zod";

type ExtractionResult = any;

// Enhanced result interface with proper typing
export interface SlashAIV2Result {
  extractionData: ExtractionResult;
  merchantId: string;
  merchantCode: string;
  extractionConfidence: number;
  parseSuccess: boolean;
  parseErrors: string[];
  transactionId?: string;
}

/**
 * Detect if email has PDF attachments
 */
function hasPDFAttachments(emailData: EmailData): boolean {
  return !!emailData.attachments?.some(
    attachment => attachment.mimeType === 'application/pdf'
  );
}

/**
 * Validate extraction data against merchant schema
 */
function validateExtractionData(
  data: unknown,
  merchant: MerchantConfig
): { isValid: boolean; extractionResult: ExtractionResult | null; errors: string[] } {
  try {
    const result = merchant.schema.parse(data);
    return { isValid: true, extractionResult: result, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        extractionResult: null, 
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      };
    }
    return { 
      isValid: false, 
      extractionResult: null, 
      errors: [error instanceof Error ? error.message : 'Unknown validation error'] 
    };
  }
}

/**
 * Build prompt for OpenAI - returns a simple string prompt
 */
function buildOpenAIPrompt(basePrompt: string, emailData: EmailData): string {
  let prompt = basePrompt;

  // Add email content
  prompt += `\n\nEMAIL TO ANALYZE:\n`;
  prompt += `FROM: ${emailData.from}\n`;
  prompt += `SUBJECT: ${emailData.subject}\n`;
  prompt += `DATE: ${emailData.date}\n\n`;
  prompt += `EMAIL BODY:\n${emailData.body}`;

  // Add attachment information if present
  if (emailData.attachments && emailData.attachments.length > 0) {
    prompt += `\n\nATTACHMENTS:\n`;
    emailData.attachments.forEach(attachment => {
      prompt += `- ${attachment.filename} (${attachment.mimeType})\n`;
      if (attachment.mimeType === 'application/pdf' && attachment.content) {
        prompt += `  PDF Content: ${attachment.content}\n`;
      }
    });
  }

  prompt += `\n\nExtract all relevant financial data according to the schema provided.`;

  return prompt;
}

/**
 * Build prompt for Mistral OCR - returns messages content array with file objects
 */
async function buildOCRPrompt(basePrompt: string, emailData: EmailData, log: any): Promise<any[]> {
  const content: any[] = [
    {
      type: "text",
      text: basePrompt
    },
    {
      type: "text",
      text: `\n\nEMAIL TO ANALYZE:\nFROM: ${emailData.from}\nSUBJECT: ${emailData.subject}\nDATE: ${emailData.date}\n\nEMAIL BODY:\n${emailData.body}\n\nExtract all relevant financial data according to the schema provided.`
    }
  ];

  // Add PDF files with their storage URLs
  if (!emailData.attachments) {
    return content;
  }

  for (const attachment of emailData.attachments) {
    if (attachment.mimeType === 'application/pdf' && attachment.storageUrl) {
      const signedUrl = await createSignedStorageUrl(attachment.storageUrl, {
        bucket: "email-attachments",
        expiresInSeconds: 60,
        log,
      });

      const fileData = (() => {
        try {
          return new URL(signedUrl);
        } catch {
          return signedUrl;
        }
      })();

      content.push({
        type: "file",
        data: fileData,
        mediaType: "application/pdf"
      });
    }
  }

  return content;
}

/**
 * Options for email data extraction
 */
export interface ExtractEmailDataOptions {
  logger?: typeof logger;
  storeTransaction?: boolean;
}

/**
 * Extract email data using OpenAI
 * Small, focused function for OpenAI-based extraction
 */
async function extractWithOpenAI(
  emailData: EmailData,
  basePrompt: string,
  schema: z.ZodSchema,
  model: LanguageModel,
  log: any
): Promise<any> {
  const prompt = buildOpenAIPrompt(basePrompt, emailData);

  log.log("Extracting with OpenAI", {
    model: "openai",
    hasAttachments: !!emailData.attachments?.length
  });

  const { object } = await generateObject({
    model: model,
    prompt: prompt,
    schema: schema,
    temperature: 1,
  });

  return object;
}

/**
 * Extract email data using OCR
 * Small, focused function for OCR-based extraction with PDFs
 */
async function extractWithOCR(
  emailData: EmailData,
  basePrompt: string,
  schema: z.ZodSchema,
  log: any
): Promise<any> {
  const content = await buildOCRPrompt(basePrompt, emailData, log);

  log.log("Extracting with OCR", {
    model: "ocr-model",
    pdfCount: emailData.attachments?.filter(a => a.mimeType === 'application/pdf').length || 0
  });

  const { object } = await generateObject({
    model: OCRModel(),
    messages: [
      {
        role: "user",
        content: content
      }
    ],
    schema: schema,
    temperature: 0.1,
    providerOptions: {
      mistral: {
        documentImageLimit: 8,
        documentPageLimit: 10,
      }
    },
    abortSignal: AbortSignal.timeout(20000), // 20s timeout
  });

  return object;
}

/**
 * Core extraction logic - router that chooses between OpenAI and OCR
 * Extracts email data without side effects (no database storage)
 * Clean, testable, and model-agnostic
 */
export async function extractEmailData(
  emailData: EmailData, 
  model: LanguageModel,
  options: ExtractEmailDataOptions = {}
): Promise<SlashAIV2Result> {
  const log = options.logger || { 
    log: console.log, 
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };

  try {
    const merchantMatch = await identifyMerchant(emailData);
    const merchant = merchantMatch?.merchant ?? getMerchantById("doordash") ?? getMerchantById("ubereats");

    if (!merchant) {
      throw new Error("No merchant configuration available for extraction");
    }

    // Detect if email has PDF attachments
    const hasPDFs = hasPDFAttachments(emailData);
    
    log.log("Processing email with SlashAI V2", {
      subject: emailData.subject,
      from: emailData.from,
      hasAttachments: !!emailData.attachments?.length,
      hasPDFAttachments: hasPDFs,
      modelUsed: hasPDFs ? "ocr-model" : "openai",
      merchant: merchant.name
    });

    // Route to appropriate extraction function based on PDF presence
    let object: any;
    
    try {
      if (hasPDFs) {
        object = await extractWithOCR(
          emailData,
          merchant.prompt,
          merchant.schema,
          log
        );
      } else {
        object = await extractWithOpenAI(
          emailData,
          merchant.prompt,
          merchant.schema,
          model,
          log
        );
      }
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        log.error("NoObjectGeneratedError: response did not match schema", {
          cause: error.cause,
          text: error.text,
          response: error.response,
          usage: error.usage,
          merchant: merchant.name
        });
      } else {
        log.error("Error in AI extraction", {
          error: error instanceof Error ? error.message : String(error),
          merchant: merchant.name
        });
      }
      throw error;
    }

    // Validate extraction results
    const { isValid, extractionResult, errors } = validateExtractionData(object, merchant);

    if (!isValid || !extractionResult) {
      log.error("Schema validation failed", {
        errors,
        merchant: merchant.name
      });

      return {
        extractionData: object as any, // Fallback for failed validation
        merchantId: merchant.id,
        merchantCode: merchant.code,
        extractionConfidence: 0,
        parseSuccess: false,
        parseErrors: errors
      };
    }

    log.log("AI extraction completed", {
      parseSuccess: extractionResult.parseSuccess,
      confidence: extractionResult.confidenceScore,
      detectedProvider: extractionResult.detectedProvider,
      emailType: extractionResult.emailType,
      hasTransaction: !!extractionResult.transaction,
      merchant: merchant.name
    });

    return {
      extractionData: extractionResult,
      merchantId: merchant.id,
      merchantCode: merchant.code,
      extractionConfidence: extractionResult.confidenceScore,
      parseSuccess: extractionResult.parseSuccess,
      parseErrors: extractionResult.parseErrors || [],
    };

  } catch (error) {
    log.error("Error in SlashAI V2 extraction", {
      error: error instanceof Error ? error.message : String(error),
      subject: emailData.subject,
      from: emailData.from
    });

    const fallbackMerchant = getMerchantById("doordash") ?? getMerchantById("ubereats") ?? getMerchantById("swiggy");

    return {
      extractionData: null as any,
      merchantId: fallbackMerchant?.id || "doordash",
      merchantCode: fallbackMerchant?.code || "DOORDASH",
      extractionConfidence: 0,
      parseSuccess: false,
      parseErrors: [error instanceof Error ? error.message : 'Unknown extraction error']
    };
  }
}

/**
 * Enhanced SlashAI agent for merchant email extraction with database storage
 * This is the original function with database storage - kept for backward compatibility
 */
export const slashAIV2Agent = async (emailData: EmailData): Promise<SlashAIV2Result> => {
  // Use the extracted function with default model
  const result = await extractEmailData(emailData, defaultModel(), { logger });

  // Store transaction if extraction was successful
  let transactionId: string | undefined;
  const resultMerchant = getMerchantById(result.merchantId) ?? getMerchantById("doordash") ?? getMerchantById("ubereats");

  if (result.parseSuccess && result.extractionData?.transaction && resultMerchant) {
    try {
      const storedTransaction = await storeTransactionV2Input({
        userId: emailData.userId,
        parsedEmailId: emailData.emailId,
        merchantId: resultMerchant.id,
        merchantCode: resultMerchant.code,
        merchantName: resultMerchant.name,
        amount: result.extractionData.transaction.amount,
        currency: result.extractionData.transaction.currency,
        type: result.extractionData.transaction.type,
        status: result.extractionData.transaction.status,
        transactionDate: new Date(result.extractionData.transaction.transactionDate || new Date().toISOString()),
        description: result.extractionData.transaction.description,
        category: result.extractionData.transaction.category,
        paymentMethod: result.extractionData.transaction.paymentMethod,
        referenceIds: result.extractionData.transaction.referenceIds,
        location: result.extractionData.transaction.location,
        // Store the complete extraction result as merchant data
        merchantData: {
          ...result.extractionData,
        },
        extractionConfidence: result.extractionData.confidenceScore,
        schemaUsed: resultMerchant.id,
        dataSource: result.extractionData.dataSource,
        isVerified: false,
        verificationStatus: "UNVERIFIED"
      });

      if (storedTransaction) {
        transactionId = storedTransaction.id;
        logger.log("Transaction stored successfully", { 
          transactionId,
          merchant: resultMerchant.name 
        });
      }

    } catch (error) {
      logger.error("Error storing transaction", {
        error: error instanceof Error ? error.message : String(error),
        merchant: resultMerchant.name
      });
    }
  }

  return {
    ...result,
    transactionId
  };
};

