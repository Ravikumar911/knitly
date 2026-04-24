import { generateObject, NoObjectGeneratedError, type LanguageModel } from "ai";
import { z } from "zod";
import { storeTransactionV2Input } from "@workspace/database";
import { defaultModel } from "../ai/model";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { EmailData } from "../types/slashAI";

type SwiggyExtractionResult = z.infer<typeof SwiggyMerchant.schema>;

export interface SlashAIV2Result {
  extractionData: SwiggyExtractionResult;
  merchantId: string;
  merchantCode: string;
  schemaUsed: "swiggy";
  extractionConfidence: number;
  parseSuccess: boolean;
  parseErrors: string[];
  transactionId?: string;
}

export interface ExtractEmailDataOptions {
  logger?: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
  };
  storeTransaction?: boolean;
}

export function buildEmailBodyPrompt(
  basePrompt: string,
  emailData: Pick<EmailData, "from" | "subject" | "date" | "body">,
): string {
  return `${basePrompt}

EMAIL TO ANALYZE:
FROM: ${emailData.from}
SUBJECT: ${emailData.subject}
DATE: ${emailData.date}

EMAIL BODY:
${emailData.body}

Extract all relevant financial data according to the schema using only the email body and headers above.`;
}

function validateExtractionData(data: unknown): {
  extractionResult: SwiggyExtractionResult | null;
  errors: string[];
} {
  const parsed = SwiggyMerchant.schema.safeParse(data);
  if (parsed.success) {
    return { extractionResult: parsed.data, errors: [] };
  }

  return {
    extractionResult: null,
    errors: parsed.error.errors.map(
      (error) => `${error.path.join(".")}: ${error.message}`,
    ),
  };
}

export async function extractFromEmailBody(
  emailData: EmailData,
  model: LanguageModel,
  options: ExtractEmailDataOptions = {},
): Promise<SlashAIV2Result> {
  const log = options.logger || {
    log: console.log,
    error: console.error,
  };

  try {
    const { object } = await generateObject({
      model,
      prompt: buildEmailBodyPrompt(SwiggyMerchant.prompt, emailData),
      schema: SwiggyMerchant.schema,
      temperature: 0.1,
    });

    const { extractionResult, errors } = validateExtractionData(object);
    if (!extractionResult) {
      return {
        extractionData: object as SwiggyExtractionResult,
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
        schemaUsed: "swiggy",
        extractionConfidence: 0,
        parseSuccess: false,
        parseErrors: errors,
      };
    }

    let transactionId: string | undefined;
    if (
      options.storeTransaction &&
      extractionResult.transaction &&
      emailData.userId
    ) {
      const stored = await storeTransactionV2Input({
        userId: emailData.userId,
        parsedEmailId: emailData.emailId || undefined,
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
        merchantName: SwiggyMerchant.name,
        amount: extractionResult.transaction.amount,
        currency: extractionResult.transaction.currency || "INR",
        type: "DEBIT",
        status: "COMPLETED",
        transactionDate: extractionResult.transaction.transactionDate
          ? new Date(extractionResult.transaction.transactionDate)
          : new Date(emailData.date),
        description:
          extractionResult.transaction.description || emailData.subject,
        category: "Food",
        paymentMethod: extractionResult.transaction.paymentMethod || undefined,
        referenceIds: extractionResult.transaction.orderId
          ? { orderId: extractionResult.transaction.orderId }
          : {},
        merchantData: extractionResult as unknown as Record<string, unknown>,
        extractionConfidence: extractionResult.confidenceScore,
        schemaUsed: "swiggy.body.v1",
        dataSource: "EMAIL_BODY",
        isVerified: false,
      });
      transactionId = stored?.id;
    }

    return {
      extractionData: extractionResult,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      schemaUsed: "swiggy",
      extractionConfidence: extractionResult.confidenceScore,
      parseSuccess: extractionResult.parseSuccess,
      parseErrors: extractionResult.parseErrors || [],
      transactionId,
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      log.error(
        "Local model response did not match the Swiggy schema",
        error.text,
      );
    } else {
      log.error("Swiggy extraction failed", error);
    }

    return {
      extractionData: null as unknown as SwiggyExtractionResult,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      schemaUsed: "swiggy",
      extractionConfidence: 0,
      parseSuccess: false,
      parseErrors: [
        error instanceof Error ? error.message : "Unknown extraction error",
      ],
    };
  }
}

export const extractEmailData = extractFromEmailBody;

export const slashAIV2Agent = async (
  emailData: EmailData,
): Promise<SlashAIV2Result> => {
  return extractFromEmailBody(emailData, defaultModel(), {
    storeTransaction: true,
  });
};
