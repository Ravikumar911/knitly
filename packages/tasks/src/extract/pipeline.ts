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
import type { ExtractionProvenance } from "./swiggy-deterministic";

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

type PipelineCandidate = {
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseErrors: string[];
  warnings: string[];
  schemaUsed: "swiggy.llm.v1" | "swiggy.fallback.v1";
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
  const parseErrors: string[] = [];

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
      parseErrors.push(`PDF attachment ${attachment.filename} was not stored.`);
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
    parseErrors.push(pdf.message);
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
  const llm = await extractSwiggyWithLlm(emailData, sources);
  if (llm.parseSuccess && llm.extractionData.transaction?.amount) {
    finalCandidate = {
      extractionData: llm.extractionData,
      extractionConfidence: llm.extractionConfidence,
      parseErrors: llm.parseErrors,
      warnings: sources.flatMap((source) => source.warnings),
      schemaUsed: "swiggy.llm.v1",
      dataSource: llm.dataSource,
      contributedByPdf: llm.contributedByPdf,
      attachmentPath:
        sources.find((source) => source.attachmentPath)?.attachmentPath ?? null,
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

  if (!finalCandidate) {
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
        warnings: sources.flatMap((source) => source.warnings),
        schemaUsed: "swiggy.fallback.v1",
        dataSource: "EMAIL_BODY",
        contributedByPdf: false,
        provenance: llm.provenance,
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
  }

  if (!finalCandidate || !finalCandidate.extractionData.transaction?.amount) {
    const failureErrors =
      llm.parseErrors.length > 0
        ? llm.parseErrors
        : parseErrors.length > 0
          ? parseErrors
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
      warnings: sources.flatMap((source) => source.warnings),
      schemaUsed: "swiggy.fallback.v1",
      dataSource: "EMAIL_BODY",
      contributedByPdf: false,
      parseSuccess: false,
      provenance: llm.provenance,
    };
  }

  const mergedErrors = [...parseErrors, ...finalCandidate.parseErrors];
  finalCandidate.extractionData.parseSuccess = true;
  finalCandidate.extractionData.parseErrors = mergedErrors;

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
    parseErrors: mergedErrors,
    parseSuccess: true,
    transactionId,
  };
}
