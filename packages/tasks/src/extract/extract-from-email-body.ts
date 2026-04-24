import { generateObject, NoObjectGeneratedError, type LanguageModel } from "ai";
import { z } from "zod";
import { storeTransactionV2Input } from "@workspace/database";
import { defaultModel } from "../ai/model";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { EmailData } from "../types/slashAI";
import { createAiAbortController } from "../utils/ai-timeout";
import { logPipelineStep } from "../utils/sync-debug";

type SwiggyExtractionResult = z.infer<typeof SwiggyMerchant.schema>;

export type EmailPdfTextSource = {
  text: string;
  attachmentPath?: string;
  pageCount?: number | null;
  extractor?: string;
  extractorVersion?: string;
};

export interface SlashAIV2Result {
  extractionData: SwiggyExtractionResult;
  merchantId: string;
  merchantCode: string;
  schemaUsed: string;
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
  pdfTextSources?: EmailPdfTextSource[];
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

export function buildEmailSourcesPrompt(
  basePrompt: string,
  emailData: Pick<EmailData, "from" | "subject" | "date" | "body">,
  pdfTextSources: EmailPdfTextSource[] = [],
): string {
  const pdfText =
    pdfTextSources.length > 0
      ? pdfTextSources
          .map((source, index) =>
            [
              `PDF_ATTACHMENT_${index + 1}_TEXT:`,
              source.text.trim() || "<empty>",
            ].join("\n"),
          )
          .join("\n\n")
      : "<none>";

  return `${basePrompt}

SOURCE WORKFLOW:
- You receive exactly two kinds of source text: the email body and Docling's PDF-to-text output.
- Use the email body and headers for message context.
- Use the Docling PDF text for invoice/order details when present.
- Do not use attachment filenames, encoded attachment payloads, or unstated assumptions.
- If the email body and PDF text conflict, prefer the PDF text for amount, order ID, item, fee, tax, payment, and delivery fields.
- Set dataSource to BOTH when both sources contribute, PDF_ATTACHMENT when only PDF text contributes, or EMAIL_BODY when only the email body contributes.
- If the sources do not describe a completed Swiggy transaction, set parseSuccess to false and omit transaction.

EMAIL TO ANALYZE:
FROM: ${emailData.from}
SUBJECT: ${emailData.subject}
DATE: ${emailData.date}

EMAIL BODY:
${emailData.body}

DOCLING PDF TEXT:
${pdfText}

Extract one Swiggy transaction according to the schema using only the source text above.`;
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
  return extractFromEmailSources(emailData, model, {
    ...options,
    pdfTextSources: [],
  });
}

export async function extractFromEmailSources(
  emailData: EmailData,
  model: LanguageModel,
  options: ExtractEmailDataOptions = {},
): Promise<SlashAIV2Result> {
  const log = options.logger || {
    log: console.log,
    error: console.error,
  };
  const pdfTextSources = options.pdfTextSources ?? [];
  const schemaUsed =
    pdfTextSources.length > 0 ? "swiggy.sources.v1" : "swiggy.body.v1";
  const dataSource = resolveDataSource(emailData, pdfTextSources);

  const abort = createAiAbortController();

  try {
    const { object } = await generateObject({
      model,
      prompt: buildEmailSourcesPrompt(
        SwiggyMerchant.prompt,
        emailData,
        pdfTextSources,
      ),
      schema: SwiggyMerchant.schema,
      schemaName: "SwiggyExtraction",
      schemaDescription: "A slash.cash Swiggy transaction extraction result.",
      mode: "json",
      maxRetries: 0,
      abortSignal: abort.signal,
      temperature: 0.1,
    });

    const { extractionResult, errors } = validateExtractionData(object);
    if (!extractionResult) {
      logPipelineStep("source-model", {
        step: 1,
        outcome: "schema_mismatch",
        errorCount: errors.length,
        errors: errors.slice(0, 6),
        emailId: emailData.emailId ?? null,
        pdfTextCount: pdfTextSources.length,
      });
      return {
        extractionData: object as SwiggyExtractionResult,
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
        schemaUsed,
        extractionConfidence: 0,
        parseSuccess: false,
        parseErrors: errors,
      };
    }

    const normalizedExtraction = normalizeExtractionMetadata(
      extractionResult,
      emailData,
      dataSource,
    );

    let transactionId: string | undefined;
    if (
      options.storeTransaction &&
      normalizedExtraction.transaction &&
      emailData.userId
    ) {
      const stored = await storeTransactionV2Input({
        userId: emailData.userId,
        parsedEmailId: emailData.emailId || undefined,
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
        merchantName: SwiggyMerchant.name,
        amount: normalizedExtraction.transaction.amount,
        currency: normalizedExtraction.transaction.currency || "INR",
        type: "DEBIT",
        status: "COMPLETED",
        transactionDate: normalizedExtraction.transaction.transactionDate
          ? new Date(normalizedExtraction.transaction.transactionDate)
          : new Date(emailData.date),
        description:
          normalizedExtraction.transaction.description || emailData.subject,
        category: "Food",
        paymentMethod:
          normalizedExtraction.transaction.paymentMethod || undefined,
        referenceIds: normalizedExtraction.transaction.orderId
          ? { orderId: normalizedExtraction.transaction.orderId }
          : {},
        merchantData: normalizedExtraction as unknown as Record<
          string,
          unknown
        >,
        extractionConfidence: normalizedExtraction.confidenceScore,
        schemaUsed,
        dataSource,
        isVerified: false,
      });
      transactionId = stored?.id;
    }

    logPipelineStep("source-model", {
      step: 1,
      outcome: "ok",
      emailId: emailData.emailId ?? null,
      confidence: normalizedExtraction.confidenceScore,
      amount: normalizedExtraction.transaction?.amount ?? null,
      hasAmount: Boolean(normalizedExtraction.transaction?.amount),
      pdfTextCount: pdfTextSources.length,
      dataSource,
    });
    return {
      extractionData: normalizedExtraction,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      schemaUsed,
      extractionConfidence: normalizedExtraction.confidenceScore,
      parseSuccess: normalizedExtraction.parseSuccess,
      parseErrors: normalizedExtraction.parseErrors || [],
      transactionId,
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      log.error("Local model response did not match the Swiggy schema", {
        responseChars: error.text?.length ?? 0,
      });
      logPipelineStep("source-model", {
        step: 1,
        outcome: "no_object_from_model",
        responseChars: error.text?.length ?? 0,
        emailId: emailData.emailId ?? null,
        pdfTextCount: pdfTextSources.length,
      });
    } else {
      log.error("Swiggy extraction failed", error);
      logPipelineStep("source-model", {
        step: 1,
        outcome: "error",
        emailId: emailData.emailId ?? null,
        message: error instanceof Error ? error.message : String(error),
        pdfTextCount: pdfTextSources.length,
      });
    }

    return {
      extractionData: null as unknown as SwiggyExtractionResult,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      schemaUsed,
      extractionConfidence: 0,
      parseSuccess: false,
      parseErrors: [
        error instanceof Error ? error.message : "Unknown extraction error",
      ],
    };
  } finally {
    abort.clear();
  }
}

function resolveDataSource(
  emailData: EmailData,
  pdfTextSources: EmailPdfTextSource[],
): "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH" {
  if (pdfTextSources.length === 0) {
    return "EMAIL_BODY";
  }

  return emailData.body.trim() ? "BOTH" : "PDF_ATTACHMENT";
}

function normalizeExtractionMetadata(
  extraction: SwiggyExtractionResult,
  emailData: EmailData,
  dataSource: "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH",
): SwiggyExtractionResult {
  return SwiggyMerchant.schema.parse({
    ...extraction,
    emailSubject: extraction.emailSubject || emailData.subject,
    dataSource: extraction.dataSource || dataSource,
    merchantId: extraction.merchantId || SwiggyMerchant.id,
    merchantCode: extraction.merchantCode || SwiggyMerchant.code,
  });
}

export const extractEmailData = extractFromEmailSources;

export const slashAIV2Agent = async (
  emailData: EmailData,
): Promise<SlashAIV2Result> => {
  return extractFromEmailSources(emailData, defaultModel(), {
    storeTransaction: true,
  });
};
