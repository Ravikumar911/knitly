import { generateObject, NoObjectGeneratedError } from "ai";
import { openai } from "@ai-sdk/openai";
import { logger } from "@trigger.dev/sdk/v3";
import { EmailData } from "../types/finwiseAI";
import { identifyMerchant } from "../merchants";
import { BaseExtractionSchema } from "../merchants/base/baseSchema";
import { SwiggyExtractionSchema } from "../merchants/swiggy/schema";
import { PhonePeExtractionSchema } from "../merchants/phonepe/schema";
import { storeTransactionV2, storeTransactionV2Input } from "@workspace/database";
import { z } from "zod";


// Type-safe schema union
const SchemaMap = {
  base: BaseExtractionSchema,
  swiggy: SwiggyExtractionSchema,
  phonepe: PhonePeExtractionSchema,
} as const;

type SchemaType = keyof typeof SchemaMap;
type SchemaInferMap = {
  [K in SchemaType]: z.infer<typeof SchemaMap[K]>;
};

// Enhanced result interface with proper typing
export interface FinwiseAIV2Result {
  extractionData: SchemaInferMap[SchemaType]; // Properly typed based on schema
  merchantId?: string;
  merchantCode?: string;
  extractionConfidence: number;
  schemaUsed: SchemaType;
  parseSuccess: boolean;
  parseErrors: string[];
  transactionId?: string;
}

/**
 * Type-safe schema selection based on merchant ID
 */
function selectSchema(merchantId?: string): { schema: z.ZodSchema<any>; schemaType: SchemaType } {
  switch (merchantId) {
    case 'swiggy':
      return { schema: SchemaMap.swiggy, schemaType: 'swiggy' };
    case 'phonepe':
      return { schema: SchemaMap.phonepe, schemaType: 'phonepe' };
    default:
      return { schema: SchemaMap.base, schemaType: 'base' };
  }
}

/**
 * Type-safe extraction data processing
 */
function processExtractionData(
  data: unknown, 
  schemaType: SchemaType
): { isValid: boolean; extractionResult: SchemaInferMap[SchemaType] | null; errors: string[] } {
  try {
    const schema = SchemaMap[schemaType];
    const result = schema.parse(data);
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
 * Enhanced FinwiseAI agent with type-safe merchant-specific schema support
 */
export const finwiseAIV2Agent = async (emailData: EmailData): Promise<FinwiseAIV2Result> => {
  try {
    logger.log("Processing email with FinwiseAI V2", {
      subject: emailData.subject,
      from: emailData.from,
      hasAttachments: !!emailData.attachments?.length
    });

    // Step 1: Identify merchant
    const merchantMatch = await identifyMerchant(emailData);

    logger.log("Merchant match", {
      merchantId: merchantMatch?.merchant.id,
      merchantCode: merchantMatch?.merchant.code,
      matchScore: merchantMatch?.matchScore,
    });

    // Step 2: Select appropriate schema based on merchant
    const { schema, schemaType } = selectSchema(merchantMatch?.merchant.id);
    const prompt = merchantMatch?.merchant.prompt || "Extract financial data from this email.";

    logger.log("Using schema", {
      merchantId: merchantMatch?.merchant.id,
      merchantCode: merchantMatch?.merchant.code,
      matchScore: merchantMatch?.matchScore,
      schemaType, 
    });

    // Step 3: Build prompt with email content
    const fullPrompt = buildEmailPrompt(prompt, emailData);


    // Step 4: Execute AI extraction with selected schema
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      prompt: fullPrompt,
      schema: schema,
    }).catch(error => {
      if (NoObjectGeneratedError.isInstance(error)) {
        console.log("NoObjectGeneratedError: response did not match schema", {
          cause: error.cause,
          text: error.text,
          response: error.response,
          usage: error.usage,
          merchantId: merchantMatch?.merchant.id,
          schemaType
        });
      } else {
        logger.error("Error in AI extraction", {
          error: error instanceof Error ? error.message : String(error),
          merchantId: merchantMatch?.merchant.id,
          schemaType
        });
      }
      throw error;
    });

    // Step 5: Validate and type-safely process results
    const { isValid, extractionResult, errors } = processExtractionData(object, schemaType);

    if (!isValid || !extractionResult) {
      logger.error("Schema validation failed", {
        schemaType,
        errors,
        merchantId: merchantMatch?.merchant.id
      });

      return {
        extractionData: object as any, // Fallback for failed validation
        merchantId: merchantMatch?.merchant.id,
        merchantCode: merchantMatch?.merchant.code,
        extractionConfidence: 0,
        schemaUsed: schemaType,
        parseSuccess: false,
        parseErrors: errors
      };
    }

    logger.log("AI extraction completed", {
      parseSuccess: extractionResult.parseSuccess,
      confidence: extractionResult.confidenceScore,
      detectedProvider: extractionResult.detectedProvider,
      emailType: extractionResult.emailType,
      hasTransaction: !!extractionResult.transaction,
      merchantId: merchantMatch?.merchant.id,
      schemaType
    });

    // Step 6: Store transaction if extraction was successful
    let transactionId: string | undefined;

    if (extractionResult.parseSuccess && extractionResult.transaction) {
      try {
        const storedTransaction = await storeTransactionV2Input({
          userId: emailData.userId,
          parsedEmailId: emailData.emailId,
          merchantId: merchantMatch?.merchant.id,
          merchantCode: merchantMatch?.merchant.code,
          merchantName: merchantMatch?.merchant.name,
          amount: extractionResult.transaction.amount,
          currency: extractionResult.transaction.currency,
          type: extractionResult.transaction.type,
          status: extractionResult.transaction.status,
          transactionDate: new Date(extractionResult.transaction.transactionDate || new Date().toISOString()),
          description: extractionResult.transaction.description,
          category: extractionResult.transaction.category,
          paymentMethod: extractionResult.transaction.paymentMethod,
          referenceIds: extractionResult.transaction.referenceIds,
          location: extractionResult.transaction.location,
          // Store the complete extraction result as merchant data
          merchantData: {
            ...extractionResult,
          },
          extractionConfidence: extractionResult.confidenceScore,
          schemaUsed: schemaType,
          dataSource: extractionResult.dataSource,
          isVerified: false,
          verificationStatus: "UNVERIFIED"
        });

        if (storedTransaction) {
          transactionId = storedTransaction.id;
          logger.log("Transaction stored successfully", { transactionId });
        }

      } catch (error) {
        logger.error("Error storing transaction", {
          error: error instanceof Error ? error.message : String(error),
          merchantId: merchantMatch?.merchant.id
        });
      }
    }

    return {
      extractionData: extractionResult,
      merchantId: merchantMatch?.merchant.id,
      merchantCode: merchantMatch?.merchant.code,
      extractionConfidence: extractionResult.confidenceScore,
      schemaUsed: schemaType,
      parseSuccess: extractionResult.parseSuccess,
      parseErrors: extractionResult.parseErrors || [],
      transactionId
    };

  } catch (error) {
    logger.error("Error in FinwiseAI V2 extraction", {
      error: error instanceof Error ? error.message : String(error),
      subject: emailData.subject,
      from: emailData.from
    });

    return {
      extractionData: null as any,
      extractionConfidence: 0,
      schemaUsed: 'base',
      parseSuccess: false,
      parseErrors: [error instanceof Error ? error.message : 'Unknown extraction error']
    };
  }
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
