import { storeTransactionV2Input } from "@workspace/database";
import { z } from "zod";
import { defaultModel } from "../ai/model";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { EmailData } from "../types/slashAI";
import { fallbackSwiggy } from "./body-fallback";
import { extractFromEmailSources } from "./extract-from-email-body";
import { extractTextFromPdf, type PdfTextSource } from "./extract-from-pdf";
import { logPipelineStep, syncDebug } from "../utils/sync-debug";

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

type PipelineCandidate = {
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseErrors: string[];
  warnings: string[];
  schemaUsed: "swiggy.body.v1" | "swiggy.sources.v1" | "swiggy.fallback.v1";
  dataSource: "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH";
  contributedByPdf: boolean;
  attachmentPath?: string | null;
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
  const skipAi = process.env.SLASHCASH_SYNC_SKIP_AI === "1";
  const model = skipAi ? null : defaultModel();

  syncDebug("pipeline-start", {
    emailId: emailData.emailId || null,
    attachmentCount: emailData.attachments?.length || 0,
    pdfAttachmentCount:
      emailData.attachments?.filter(
        (attachment) => attachment.mimeType === "application/pdf",
      ).length || 0,
    skipAi,
  });

  const pdfTextSources: PdfTextSource[] = [];
  const pdfFailures: { filename: string; message: string }[] = [];
  for (const attachment of emailData.attachments || []) {
    if (attachment.mimeType !== "application/pdf" || !attachment.storageUrl) {
      continue;
    }

    syncDebug("pdf-extraction-start", {
      emailId: emailData.emailId || null,
      filename: attachment.filename,
      path: attachment.storageUrl,
    });
    const pdf = await extractTextFromPdf({
      attachmentPath: attachment.storageUrl,
    });
    if (pdf.ok) {
      pdfTextSources.push(pdf.value);
      syncDebug("pdf-extraction-ok", {
        emailId: emailData.emailId || null,
        filename: attachment.filename,
        textChars: pdf.value.text.length,
        warningCount: pdf.value.warnings.length,
      });
      continue;
    }
    parseErrors.push(pdf.message);
    pdfFailures.push({ filename: attachment.filename, message: pdf.message });
    syncDebug("pdf-extraction-failed", {
      emailId: emailData.emailId || null,
      filename: attachment.filename,
      message: pdf.message,
    });
  }
  if (pdfTextSources.length > 0) {
    logPipelineStep("pdf", {
      step: 2,
      emailId: emailData.emailId ?? null,
      outcome: "text",
      sourceCount: pdfTextSources.length,
      textChars: pdfTextSources.reduce(
        (sum, source) => sum + source.text.length,
        0,
      ),
      warnings: pdfTextSources.flatMap((source) => source.warnings),
    });
  } else {
    const hadPdf = (emailData.attachments || []).some(
      (a) => a.mimeType === "application/pdf" && a.storageUrl,
    );
    logPipelineStep("pdf", {
      step: 2,
      emailId: emailData.emailId ?? null,
      outcome: "none",
      hadPdfAttachment: hadPdf,
      note: "see pdf-extractor line(s) for subprocess errors or docling output",
      failures: hadPdf && pdfFailures.length > 0 ? pdfFailures : undefined,
    });
  }

  let finalCandidate: PipelineCandidate | null = null;
  if (model) {
    syncDebug("source-extraction-start", {
      emailId: emailData.emailId || null,
      model: process.env.OLLAMA_CHAT_MODEL || null,
      pdfTextCount: pdfTextSources.length,
    });
    const extracted = await extractFromEmailSources(emailData, model, {
      storeTransaction: false,
      pdfTextSources,
    });
    if (
      extracted.parseSuccess &&
      extracted.extractionData?.transaction?.amount
    ) {
      const candidateDataSource = resolveCandidateDataSource(
        extracted.extractionData,
        emailData,
        pdfTextSources,
      );
      finalCandidate = {
        extractionData: {
          ...extracted.extractionData,
          dataSource: candidateDataSource,
        },
        extractionConfidence: extracted.extractionConfidence,
        parseErrors: extracted.parseErrors,
        warnings: pdfTextSources.flatMap((source) => source.warnings),
        schemaUsed:
          pdfTextSources.length > 0 ? "swiggy.sources.v1" : "swiggy.body.v1",
        dataSource: candidateDataSource,
        contributedByPdf:
          pdfTextSources.length > 0 && candidateDataSource !== "EMAIL_BODY",
        attachmentPath: pdfTextSources[0]?.attachmentPath ?? null,
      };
      logPipelineStep("merge", {
        step: 3,
        emailId: emailData.emailId ?? null,
        decision: "llm_sources",
        schemaUsed: finalCandidate.schemaUsed,
        dataSource: finalCandidate.dataSource,
        amount: finalCandidate.extractionData.transaction?.amount ?? null,
        confidence: finalCandidate.extractionConfidence,
        pdfTextCount: pdfTextSources.length,
      });
      syncDebug("pipeline-using-source-model", {
        emailId: emailData.emailId || null,
        confidence: finalCandidate.extractionConfidence,
        amount: finalCandidate.extractionData.transaction?.amount ?? null,
        warningCount: finalCandidate.warnings.length,
        parseErrorCount: finalCandidate.parseErrors.length,
        dataSource: finalCandidate.dataSource,
      });
    } else {
      parseErrors.push(...extracted.parseErrors);
      logPipelineStep("merge", {
        step: 3,
        emailId: emailData.emailId ?? null,
        decision: "no_llm_transaction",
        parseErrorCount: extracted.parseErrors.length,
        pdfTextCount: pdfTextSources.length,
      });
      syncDebug("source-extraction-empty", {
        emailId: emailData.emailId || null,
        parseErrorCount: extracted.parseErrors.length,
      });
    }
  } else {
    logPipelineStep("merge", {
      step: 3,
      emailId: emailData.emailId ?? null,
      decision: "llm_skipped",
      reason: skipAi ? "SLASHCASH_SYNC_SKIP_AI=1" : "no_chat_model",
      pdfTextCount: pdfTextSources.length,
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
            paymentMethod: "UPI",
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
        warnings: [],
        schemaUsed: "swiggy.fallback.v1",
        dataSource: "EMAIL_BODY",
        contributedByPdf: false,
      };
      logPipelineStep("merge", {
        step: 3,
        emailId: emailData.emailId ?? null,
        decision: "fallback",
        schemaUsed: "swiggy.fallback.v1",
        amount: finalCandidate.extractionData.transaction?.amount ?? null,
      });
      syncDebug("pipeline-using-fallback", {
        emailId: emailData.emailId || null,
        confidence: finalCandidate.extractionConfidence,
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
    syncDebug("pipeline-no-transaction", {
      emailId: emailData.emailId || null,
      parseErrors,
    });
    return {
      extractionData: SwiggyMerchant.schema.parse({
        detectedProvider: "Swiggy",
        emailType: "OTHER",
        emailSubject: emailData.subject,
        parseSuccess: false,
        parseErrors:
          parseErrors.length > 0
            ? parseErrors
            : ["Could not extract transaction data from the email."],
        confidenceScore: 0,
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
      }),
      extractionConfidence: 0,
      parseErrors:
        parseErrors.length > 0
          ? parseErrors
          : ["Could not extract transaction data from the email."],
      warnings: [],
      schemaUsed: "swiggy.fallback.v1",
      dataSource: "EMAIL_BODY",
      contributedByPdf: false,
      parseSuccess: false,
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
        ? { orderId: finalCandidate.extractionData.transaction.orderId }
        : {},
      merchantData: {
        ...finalCandidate.extractionData,
        warnings: finalCandidate.warnings,
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

function resolveCandidateDataSource(
  extractionData: SwiggyExtraction,
  emailData: EmailData,
  pdfTextSources: PdfTextSource[],
): "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH" {
  if (pdfTextSources.length === 0) {
    return "EMAIL_BODY";
  }

  if (extractionData.dataSource) {
    return extractionData.dataSource;
  }

  if (emailData.body.trim()) {
    return "BOTH";
  }

  return "PDF_ATTACHMENT";
}
