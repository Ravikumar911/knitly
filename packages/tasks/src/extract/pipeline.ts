import { storeTransactionV2Input } from "@workspace/database";
import { z } from "zod";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { EmailData } from "../types/email-extraction";
import { logPipelineStep, syncDebug } from "../utils/sync-debug";
import { fallbackSwiggy } from "./body-fallback";
import {
  extractTextFromPdf,
  type PdfExtractionSource,
} from "./extract-from-pdf";
import { extractSwiggyWithLlm } from "./swiggy-llm";
import {
  extractSwiggyBodySignals,
  isSwiggyMarketingEmail,
} from "./swiggy-body-signals";
import { resolveAssistantRuntimeConfig } from "./llm-model";
import type { ExtractionProvenance } from "./swiggy-deterministic";

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

type PipelineCandidate = {
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseErrors: string[];
  warnings: string[];
  schemaUsed:
    | "swiggy.deterministic.v1"
    | "swiggy.body.v1"
    | "swiggy.llm.v1"
    | "swiggy.fallback.v1";
  dataSource: "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH";
  contributedByPdf: boolean;
  attachmentPath?: string | null;
  provenance: ExtractionProvenance | null;
};

export type PipelineExtractionResult = PipelineCandidate & {
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

  const sources: PdfExtractionSource[] = [];
  const pdfAttachments = (emailData.attachments || []).filter(
    (attachment) => attachment.mimeType === "application/pdf",
  );

  for (const attachment of pdfAttachments) {
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
  let classifiedNonTransaction = false;
  let llm: Awaited<ReturnType<typeof extractSwiggyWithLlm>> | null = null;
  const deterministic = buildDeterministicPdfCandidate(emailData, sources);
  if (deterministic) {
    finalCandidate = deterministic;
    logPipelineStep("merge", {
      step: 3,
      emailId: emailData.emailId ?? null,
      decision: "deterministic-pdf",
      schemaUsed: finalCandidate.schemaUsed,
      dataSource: finalCandidate.dataSource,
      amount: finalCandidate.extractionData.transaction?.amount ?? null,
      orderId: finalCandidate.extractionData.transaction?.orderId ?? null,
      confidence: finalCandidate.extractionConfidence,
      sourceCount: sources.length,
    });
  }

  if (!finalCandidate) {
    if (isSwiggyMarketingEmail(emailData.subject, emailData.body)) {
      classifiedNonTransaction = true;
      logPipelineStep("merge", {
        step: 3,
        emailId: emailData.emailId ?? null,
        decision: "none",
        reason: "marketing_email",
      });
    } else {
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
          extractionConfidence: 0.7,
          parseErrors: [],
          warnings: [
            ...sourceWarnings,
            ...sources.flatMap((source) => source.warnings),
          ],
          schemaUsed: "swiggy.body.v1",
          dataSource: "EMAIL_BODY",
          contributedByPdf: false,
          provenance: null,
        };
        logPipelineStep("merge", {
          step: 3,
          emailId: emailData.emailId ?? null,
          decision: "fallback",
          schemaUsed: "swiggy.body.v1",
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
    }
  }

  if (
    !finalCandidate &&
    !classifiedNonTransaction &&
    shouldTryLlmExtraction()
  ) {
    llm = await extractSwiggyWithLlm(emailData, sources);
    if (llm.parseSuccess && llm.extractionData.transaction?.amount) {
      finalCandidate = {
        extractionData: llm.extractionData,
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
        orderId: finalCandidate.extractionData.transaction?.orderId ?? null,
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

  if (!finalCandidate || !finalCandidate.extractionData.transaction?.amount) {
    const failureErrors =
      llm && llm.parseErrors.length > 0
        ? llm.parseErrors
        : sourceWarnings.length > 0
          ? sourceWarnings
          : ["No completed Swiggy transaction was found."];
    syncDebug("pipeline-no-transaction", {
      emailId: emailData.emailId || null,
      parseErrors: failureErrors,
    });
    return {
      extractionData: SwiggyMerchant.schema.parse({
        detectedProvider: "Swiggy",
        emailType: "OTHER",
        emailSubject: emailData.subject,
        parseSuccess: false,
        parseErrors: failureErrors,
        confidenceScore: 0,
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
      }),
      extractionConfidence: 0,
      parseErrors: failureErrors,
      warnings: [
        ...sourceWarnings,
        ...sources.flatMap((source) => source.warnings),
      ],
      schemaUsed: "swiggy.fallback.v1",
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
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      merchantName: SwiggyMerchant.name,
      amount: finalCandidate.extractionData.transaction.amount,
      currency: finalCandidate.extractionData.transaction.currency || "INR",
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
      referenceIds: finalCandidate.extractionData.transaction.orderId
        ? finalCandidate.extractionData.transaction.referenceIds
        : {},
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

function buildDeterministicPdfCandidate(
  emailData: EmailData,
  sources: PdfExtractionSource[],
): PipelineCandidate | null {
  const source = sources.find(
    (candidate) =>
      candidate.sourceQuality.kind === "text" &&
      (candidate.text.trim() ||
        Object.keys(candidate.extraction.fields).length),
  );
  if (!source) return null;

  const pdfText = source.text;
  const rawText = `${source.text}\n${emailData.body}\n${emailData.subject}`;
  const fields = source.extraction.fields;
  const amount = firstNumber(
    fields.paid_amount,
    fields.invoice_total,
    fields.total,
    extractAmount(pdfText),
    extractAmount(rawText),
  );
  if (!amount || amount <= 0) return null;

  const orderId =
    firstString(fields.order_id, fields.orderId) ||
    extractSwiggyBodySignals({
      subject: "",
      body: pdfText,
    }).orderId ||
    extractSwiggyBodySignals({
      subject: emailData.subject,
      body: emailData.body,
      threadId: emailData.threadId,
    }).orderId ||
    emailData.threadId;
  const restaurant =
    firstString(fields.restaurant_name, fields.restaurantName) ||
    extractRestaurant(rawText) ||
    "Swiggy";
  const paymentMethod =
    firstString(fields.payment_method, fields.paymentMethod) ||
    extractPaymentMethod(rawText);
  const pincode = firstString(fields.pincode) || extractPincode(rawText);
  const service = normalizeServiceType(firstString(fields.service_type));

  return {
    extractionData: SwiggyMerchant.schema.parse({
      detectedProvider: "Swiggy",
      emailType: "ORDER_CONFIRMATION",
      emailSubject: emailData.subject,
      parseSuccess: true,
      parseErrors: [],
      confidenceScore: source.extraction.confidence || 0.9,
      dataSource: "BOTH",
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      transaction: {
        amount,
        currency: "INR",
        type: "DEBIT",
        status: "COMPLETED",
        transactionDate:
          firstString(fields.invoice_date, fields.transaction_date) ||
          emailData.date,
        description: `Swiggy order - ${restaurant}`,
        category: "Food",
        paymentMethod: paymentMethod ?? undefined,
        referenceIds: orderId ? { orderId } : {},
        orderId: orderId ?? undefined,
        restaurantName: restaurant,
        deliveryAddress: pincode ? { pincode } : undefined,
        deliveryFee: firstNumber(fields.delivery_fee) ?? undefined,
        taxes: firstNumber(fields.tax_total) ?? undefined,
        discount: firstNumber(fields.discount_total) ?? undefined,
        packagingFee: firstNumber(fields.packaging_fee) ?? undefined,
      } satisfies NonNullable<SwiggyExtraction["transaction"]>,
      swiggyMetadata: {
        service,
        orderType: "DELIVERY",
      },
    }),
    extractionConfidence: source.extraction.confidence || 0.9,
    parseErrors: [],
    warnings: source.warnings,
    schemaUsed: "swiggy.deterministic.v1",
    dataSource: "BOTH",
    contributedByPdf: true,
    attachmentPath: source.attachmentPath,
    provenance: {
      parser: source.extractor,
      parserVersion: source.extractorVersion,
      parsersUsed: source.sourceQuality.parsers_used,
      sourceQuality: source.sourceQuality.kind,
      warnings: source.warnings,
      pdfAttachmentPath: source.attachmentPath,
      extractedAt: new Date().toISOString(),
    },
  };
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const numeric = Number(value.replace(/[,₹\s]/g, ""));
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return null;
}

function extractAmount(text: string) {
  const match = text.match(
    /\b(?:total|paid amount|amount paid|grand total)\b\s*:?\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
  );
  return match ? Number(match[1]) : null;
}

function extractRestaurant(text: string) {
  return firstString(text.match(/\bRestaurant\s*:?\s*([^\n|]+)/i)?.[1]);
}

function extractPaymentMethod(text: string) {
  return firstString(
    text.match(/\bPayment Method\s*:?\s*([^\n|]+)/i)?.[1],
    text.match(/\bPaid Via\s+(.{2,80}?)\s*(?:₹|rs\.?|inr)/i)?.[1],
  );
}

function extractPincode(text: string) {
  return firstString(text.match(/\bPincode\s*:?\s*([0-9]{6})/i)?.[1]);
}

function normalizeServiceType(value: string | null) {
  if (
    value === "FOOD_DELIVERY" ||
    value === "INSTAMART" ||
    value === "GENIE" ||
    value === "DINEOUT"
  ) {
    return value;
  }
  return "FOOD_DELIVERY";
}

function shouldTryLlmExtraction() {
  try {
    return resolveAssistantRuntimeConfig().provider !== "none";
  } catch {
    return false;
  }
}
