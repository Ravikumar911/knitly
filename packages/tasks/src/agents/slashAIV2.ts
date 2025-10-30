import { generateObject, NoObjectGeneratedError, LanguageModel } from "ai";
import { defaultModel } from "../ai/model";
import { logger } from "@trigger.dev/sdk/v3";
import { EmailData } from "../types/slashAI";
import { SwiggyMerchant } from "../merchants/swiggy";
import { storeTransactionV2, storeTransactionV2Input } from "@workspace/database";
import { z } from "zod";

// Type for Swiggy extraction result
type SwiggyExtractionResult = z.infer<typeof SwiggyMerchant.schema>;

// Enhanced result interface with proper typing
export interface SlashAIV2Result {
  extractionData: SwiggyExtractionResult;
  merchantId: string;
  merchantCode: string;
  extractionConfidence: number;
  parseSuccess: boolean;
  parseErrors: string[];
  transactionId?: string;
}

/**
 * Validate extraction data against Swiggy schema
 */
function validateExtractionData(
  data: unknown
): { isValid: boolean; extractionResult: SwiggyExtractionResult | null; errors: string[] } {
  try {
    const result = SwiggyMerchant.schema.parse(data);
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
 * Options for email data extraction
 */
export interface ExtractEmailDataOptions {
  logger?: typeof logger;
  storeTransaction?: boolean;
}

/**
 * Core extraction logic - testable and model-agnostic
 * Extracts email data without side effects (no database storage)
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
    log.log("Processing email with SlashAI V2", {
      subject: emailData.subject,
      from: emailData.from,
      hasAttachments: !!emailData.attachments?.length,
      merchant: SwiggyMerchant.name
    });

    // Step 1: Build prompt with email content using Swiggy's prompt
    const fullPrompt = buildEmailPrompt(SwiggyMerchant.prompt, emailData);

    // Step 2: Execute AI extraction with Swiggy schema
    const { object } = await generateObject({
      model: model,
      prompt: fullPrompt,
      schema: SwiggyMerchant.schema,
      temperature: 1,
    }).catch(error => {
      if (NoObjectGeneratedError.isInstance(error)) {
        console.log("NoObjectGeneratedError: response did not match schema", {
          cause: error.cause,
          text: error.text,
          response: error.response,
          usage: error.usage,
          merchant: SwiggyMerchant.name
        });
      } else {
        log.error("Error in AI extraction", {
          error: error instanceof Error ? error.message : String(error),
          merchant: SwiggyMerchant.name
        });
      }
      throw error;
    });

    // Step 3: Validate extraction results
    const { isValid, extractionResult, errors } = validateExtractionData(object);

    if (!isValid || !extractionResult) {
      log.error("Schema validation failed", {
        errors,
        merchant: SwiggyMerchant.name
      });

      return {
        extractionData: object as any, // Fallback for failed validation
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
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
      merchant: SwiggyMerchant.name
    });

    return {
      extractionData: extractionResult,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      extractionConfidence: extractionResult.confidenceScore,
      parseSuccess: extractionResult.parseSuccess,
      parseErrors: extractionResult.parseErrors || [],
    };

  } catch (error) {
    log.error("Error in SlashAI V2 extraction", {
      error: error instanceof Error ? error.message : String(error),
      subject: emailData.subject,
      from: emailData.from,
      merchant: SwiggyMerchant.name
    });

    return {
      extractionData: null as any,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      extractionConfidence: 0,
      parseSuccess: false,
      parseErrors: [error instanceof Error ? error.message : 'Unknown extraction error']
    };
  }
}

/**
 * Enhanced SlashAI agent for Swiggy email extraction with database storage
 * This is the original function with database storage - kept for backward compatibility
 */
export const slashAIV2Agent = async (emailData: EmailData): Promise<SlashAIV2Result> => {
  // Use the extracted function with default model
  const result = await extractEmailData(emailData, defaultModel(), { logger });

  // Store transaction if extraction was successful
  let transactionId: string | undefined;

  if (result.parseSuccess && result.extractionData?.transaction) {
    try {
      const storedTransaction = await storeTransactionV2Input({
        userId: emailData.userId,
        parsedEmailId: emailData.emailId,
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
        merchantName: SwiggyMerchant.name,
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
        schemaUsed: SwiggyMerchant.id,
        dataSource: result.extractionData.dataSource,
        isVerified: false,
        verificationStatus: "UNVERIFIED"
      });

      if (storedTransaction) {
        transactionId = storedTransaction.id;
        logger.log("Transaction stored successfully", { 
          transactionId,
          merchant: SwiggyMerchant.name 
        });
      }

    } catch (error) {
      logger.error("Error storing transaction", {
        error: error instanceof Error ? error.message : String(error),
        merchant: SwiggyMerchant.name
      });
    }
  }

  return {
    ...result,
    transactionId
  };
};

/**
 * Build the complete prompt with email content
 */
function buildEmailPrompt(basePrompt: string, emailData: EmailData): string {
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
