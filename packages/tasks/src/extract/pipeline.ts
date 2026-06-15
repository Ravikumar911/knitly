import { storeTransactionV2Input } from "@workspace/database";
import { z } from "zod";
import { identifyMerchant } from "../merchants";
import { BaseExtractionSchema } from "../merchants/base/baseSchema";
import type { FoodDeliveryExtraction } from "../merchants/food-delivery/schema";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { MerchantConfig } from "../merchants/types";
import type { EmailData } from "../types/email-extraction";
import { logPipelineStep, syncDebug } from "../utils/sync-debug";
import { fallbackFoodDelivery, fallbackSwiggy } from "./body-fallback";
import {
  extractTextFromPdf,
  type PdfExtractionSource,
} from "./extract-from-pdf";
import { extractSwiggyWithLlm } from "./swiggy-llm";
import { isSwiggyMarketingEmail } from "./swiggy-body-signals";
import type { ExtractionProvenance } from "./swiggy-deterministic";

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;
type BaseExtraction = z.infer<typeof BaseExtractionSchema>;
type SupportedExtraction =
  | BaseExtraction
  | SwiggyExtraction
  | FoodDeliveryExtraction;

type PipelineCandidate = {
  extractionData: SupportedExtraction;
  merchant: MerchantConfig;
  extractionConfidence: number;
  parseErrors: string[];
  warnings: string[];
  schemaUsed: string;
  dataSource: "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH";
  contributedByPdf: boolean;
  attachmentPath?: string | null;
  provenance: ExtractionProvenance | null;
};

export type PipelineExtractionResult = Omit<PipelineCandidate, "merchant"> & {
  merchant?: MerchantConfig;
  parseSuccess: boolean;
  transactionId?: string;
};

export async function extractTransactionFromEmail(
  emailData: EmailData,
  options: {
    parsedEmailId?: string;
    storeTransaction?: boolean;
  } = {},
): Promise<PipelineExtractionResult> {
  const sourceWarnings: string[] = [];

  syncDebug("pipeline-start", {
    emailId: emailData.emailId || null,
    attachmentCount: emailData.attachments?.length || 0,
    pdfAttachmentCount:
      emailData.attachments?.filter(
        (attachment) => attachment.mimeType === "application/pdf",
      ).length || 0,
  });

  const merchantMatch = await identifyMerchant(emailData);
  const merchant = merchantMatch?.merchant ?? null;

  if (!merchant) {
    const parseErrors = ["No supported merchant matched this email."];
    return {
      extractionData: BaseExtractionSchema.parse({
        detectedProvider: "Unknown",
        emailType: "OTHER",
        emailSubject: emailData.subject,
        parseSuccess: false,
        parseErrors,
        confidenceScore: 0,
      }),
      extractionConfidence: 0,
      parseErrors,
      warnings: [],
      schemaUsed: "base.body.v1",
      dataSource: "EMAIL_BODY",
      contributedByPdf: false,
      parseSuccess: false,
      provenance: null,
    };
  }

  const sources: PdfExtractionSource[] = [];
  const pdfAttachments = (emailData.attachments || []).filter(
    (attachment) => attachment.mimeType === "application/pdf",
  );

  for (const attachment of merchant.id === "swiggy" ? pdfAttachments : []) {
    if (!attachment.storageUrl) {
      sourceWarnings.push(
        `PDF attachment ${attachment.filename} was not stored.`,
      );
      continue;
    }

    syncDebug("pdf-extraction-start", {
      emailId: emailData.emailId || null,
      filename: attachment.filename,
      path: attachment.storageUrl,
    });
    const pdf = await extractTextFromPdf({
      attachmentPath: attachment.storageUrl,
      emailBody: emailData.body,
      subject: emailData.subject,
    });
    if (pdf.ok) {
      sources.push(pdf.value);
      syncDebug("pdf-extraction-ok", {
        emailId: emailData.emailId || null,
        filename: attachment.filename,
        textChars: pdf.value.text.length,
        warningCount: pdf.value.warnings.length,
        sourceQuality: pdf.value.sourceQuality.kind,
      });
      continue;
    }
    sourceWarnings.push(pdf.message);
    syncDebug("pdf-extraction-failed", {
      emailId: emailData.emailId || null,
      filename: attachment.filename,
      message: pdf.message,
    });
  }

  logPipelineStep("pdf", {
    step: 2,
    emailId: emailData.emailId ?? null,
    outcome: sources.length > 0 ? "sources" : "none",
    sourceCount: sources.length,
    textChars: sources.reduce((sum, source) => sum + source.text.length, 0),
    warnings: sources.flatMap((source) => source.warnings),
  });

  let finalCandidate: PipelineCandidate | null = null;
  const llm =
    merchant.id === "swiggy"
      ? await extractSwiggyWithLlm(emailData, sources)
      : null;
  if (llm) {
    if (llm.parseSuccess && llm.extractionData.transaction?.amount) {
      finalCandidate = {
        extractionData: llm.extractionData,
        merchant,
        extractionConfidence: llm.extractionConfidence,
        parseErrors: llm.parseErrors,
        warnings: [
          ...sourceWarnings,
          ...sources.flatMap((source) => source.warnings),
        ],
        schemaUsed: "swiggy.llm.v1",
        dataSource: llm.dataSource,
        contributedByPdf: llm.contributedByPdf,
        attachmentPath:
          sources.find((source) => source.attachmentPath)?.attachmentPath ??
          null,
        provenance: llm.provenance,
      };
      logPipelineStep("merge", {
        step: 3,
        emailId: emailData.emailId ?? null,
        decision: "llm",
        schemaUsed: finalCandidate.schemaUsed,
        dataSource: finalCandidate.dataSource,
        amount: finalCandidate.extractionData.transaction?.amount ?? null,
        orderId: getOrderId(finalCandidate.extractionData) ?? null,
        confidence: finalCandidate.extractionConfidence,
        sourceCount: sources.length,
      });
    } else {
      syncDebug("llm-extraction-empty", {
        emailId: emailData.emailId || null,
        parseErrorCount: llm.parseErrors.length,
        sourceCount: sources.length,
      });
    }
  }

  if (!finalCandidate) {
    if (
      merchant.id === "swiggy" &&
      isSwiggyMarketingEmail(emailData.subject, emailData.body)
    ) {
      logPipelineStep("merge", {
        step: 3,
        emailId: emailData.emailId ?? null,
        decision: "none",
        reason: "marketing_email",
      });
    } else if (merchant.id === "swiggy") {
      const fallback = fallbackSwiggy(emailData);
      if (fallback) {
        finalCandidate = {
          extractionData: SwiggyMerchant.schema.parse({
            detectedProvider: "Swiggy",
            emailType: "ORDER_CONFIRMATION",
            emailSubject: emailData.subject,
            parseSuccess: true,
            parseErrors: [],
            confidenceScore: 0.7,
            dataSource: "EMAIL_BODY",
            merchantId: SwiggyMerchant.id,
            merchantCode: SwiggyMerchant.code,
            transaction: {
              amount: fallback.amount,
              currency: "INR",
              type: "DEBIT",
              status: "COMPLETED",
              transactionDate: emailData.date,
              description: fallback.description,
              category: "Food",
              paymentMethod: fallback.paymentMethod ?? undefined,
              referenceIds: { orderId: fallback.orderId },
              orderId: fallback.orderId,
              restaurantName: fallback.restaurant,
              deliveryAddress: {
                fullAddress: fallback.deliveryAddress || undefined,
              },
            } satisfies NonNullable<SwiggyExtraction["transaction"]>,
            swiggyMetadata: {
              service: "FOOD_DELIVERY",
              orderType: "DELIVERY",
            },
          }),
          merchant,
          extractionConfidence: 0.7,
          parseErrors: [],
          warnings: [
            ...sourceWarnings,
            ...sources.flatMap((source) => source.warnings),
            ...(llm?.parseErrors ?? []),
          ],
          schemaUsed: "swiggy.fallback.v1",
          dataSource: "EMAIL_BODY",
          contributedByPdf: false,
          provenance: llm?.provenance ?? null,
        };
        logPipelineStep("merge", {
          step: 3,
          emailId: emailData.emailId ?? null,
          decision: "fallback",
          schemaUsed: "swiggy.fallback.v1",
          amount: finalCandidate.extractionData.transaction?.amount ?? null,
        });
      } else {
        logPipelineStep("merge", {
          step: 3,
          emailId: emailData.emailId ?? null,
          decision: "none",
          reason: "no_body_pdf_or_fallback",
        });
      }
    } else {
      const fallback = fallbackFoodDelivery(emailData, merchant);
      if (fallback) {
        finalCandidate = {
          extractionData: merchant.schema.parse({
            detectedProvider: merchant.name,
            emailType: "ORDER_CONFIRMATION",
            emailSubject: emailData.subject,
            parseSuccess: true,
            parseErrors: [],
            confidenceScore: 0.72,
            dataSource: "EMAIL_BODY",
            merchantId: merchant.id,
            merchantCode: merchant.code,
            transaction: {
              amount: fallback.amount,
              currency: fallback.currency,
              type: "DEBIT",
              status: "COMPLETED",
              transactionDate: emailData.date,
              description: fallback.description,
              category: "Food",
              paymentMethod: fallback.paymentMethod ?? undefined,
              referenceIds: { orderId: fallback.orderId },
              orderId: fallback.orderId,
              restaurantName: fallback.restaurant,
              deliveryAddress: fallback.deliveryAddress
                ? { fullAddress: fallback.deliveryAddress }
                : undefined,
            },
            foodDeliveryMetadata: {
              service: "FOOD_DELIVERY",
              fulfillmentType: "DELIVERY",
            },
          }) as SupportedExtraction,
          merchant,
          extractionConfidence: 0.72,
          parseErrors: [],
          warnings: sourceWarnings,
          schemaUsed: `${merchant.id}.body.v1`,
          dataSource: "EMAIL_BODY",
          contributedByPdf: false,
          provenance: null,
        };
        logPipelineStep("merge", {
          step: 3,
          emailId: emailData.emailId ?? null,
          decision: "fallback",
          schemaUsed: finalCandidate.schemaUsed,
          amount: finalCandidate.extractionData.transaction?.amount ?? null,
        });
      } else {
        logPipelineStep("merge", {
          step: 3,
          emailId: emailData.emailId ?? null,
          decision: "none",
          reason: "no_supported_receipt_body",
        });
      }
    }
  }

  if (!finalCandidate || !finalCandidate.extractionData.transaction?.amount) {
    const failureErrors =
      (llm?.parseErrors.length ?? 0) > 0
        ? (llm?.parseErrors ?? [])
        : sourceWarnings.length > 0
          ? sourceWarnings
          : [`No completed ${merchant.name} transaction was found.`];
    syncDebug("pipeline-no-transaction", {
      emailId: emailData.emailId || null,
      parseErrors: failureErrors,
    });
    return {
      extractionData: merchant.schema.parse({
        detectedProvider: merchant.name,
        emailType: "OTHER",
        emailSubject: emailData.subject,
        parseSuccess: false,
        parseErrors: failureErrors,
        confidenceScore: 0,
        merchantId: merchant.id,
        merchantCode: merchant.code,
      }) as SupportedExtraction,
      extractionConfidence: 0,
      parseErrors: failureErrors,
      warnings: [
        ...sourceWarnings,
        ...sources.flatMap((source) => source.warnings),
      ],
      schemaUsed:
        merchant.id === "swiggy"
          ? "swiggy.fallback.v1"
          : `${merchant.id}.body.v1`,
      dataSource: "EMAIL_BODY",
      contributedByPdf: false,
      parseSuccess: false,
      provenance: llm?.provenance ?? null,
    };
  }

  const fatalErrors = finalCandidate.parseErrors;
  finalCandidate.extractionData.parseErrors = fatalErrors;
  finalCandidate.extractionData.parseSuccess =
    fatalErrors.length === 0 &&
    Boolean(finalCandidate.extractionData.parseSuccess);

  let transactionId: string | undefined;
  if (options.storeTransaction) {
    const stored = await storeTransactionV2Input({
      userId: emailData.userId,
      parsedEmailId: options.parsedEmailId || emailData.emailId,
      merchantId: finalCandidate.merchant.id,
      merchantCode: finalCandidate.merchant.code,
      merchantName: finalCandidate.merchant.name,
      amount: finalCandidate.extractionData.transaction.amount,
      // Non-Swiggy body fallback currently emits USD only; broader currency
      // support should parse the symbol/code before storing non-US receipts.
      currency:
        finalCandidate.extractionData.transaction.currency ||
        (finalCandidate.merchant.id === "swiggy" ? "INR" : "USD"),
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: new Date(
        finalCandidate.extractionData.transaction.transactionDate ||
          emailData.date,
      ),
      description:
        finalCandidate.extractionData.transaction.description ||
        emailData.subject,
      category: "Food",
      paymentMethod:
        finalCandidate.extractionData.transaction.paymentMethod || undefined,
      referenceIds: getReferenceIds(finalCandidate.extractionData),
      merchantData: {
        ...finalCandidate.extractionData,
        warnings: finalCandidate.warnings,
        provenance: finalCandidate.provenance,
      } as Record<string, unknown>,
      extractionConfidence: finalCandidate.extractionConfidence,
      schemaUsed: finalCandidate.schemaUsed,
      dataSource: finalCandidate.dataSource,
      isVerified: false,
    });
    transactionId = stored?.id;
    syncDebug("transaction-written", {
      emailId: emailData.emailId || null,
      parsedEmailId: options.parsedEmailId || emailData.emailId || null,
      transactionId: transactionId || null,
      schemaUsed: finalCandidate.schemaUsed,
      dataSource: finalCandidate.dataSource,
      confidence: finalCandidate.extractionConfidence,
    });
  }

  return {
    ...finalCandidate,
    parseErrors: fatalErrors,
    parseSuccess: finalCandidate.extractionData.parseSuccess,
    transactionId,
  };
}

export function getOrderId(extractionData: SupportedExtraction) {
  const transaction = extractionData.transaction as
    | { orderId?: unknown }
    | undefined;
  return typeof transaction?.orderId === "string"
    ? transaction.orderId
    : undefined;
}

export function getReferenceIds(extractionData: SupportedExtraction) {
  const transaction = extractionData.transaction;
  const referenceIds =
    transaction?.referenceIds && typeof transaction.referenceIds === "object"
      ? transaction.referenceIds
      : {};
  const orderId = getOrderId(extractionData);
  return orderId ? { ...referenceIds, orderId } : referenceIds;
}
