import { storeTransactionV2Input } from "@workspace/database";
import { z } from "zod";
import { defaultModel } from "../ai/model";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { EmailData } from "../types/slashAI";
import { fallbackSwiggy } from "./body-fallback";
import { extractFromEmailBody } from "./extract-from-email-body";
import {
  extractFromPdf,
  type PdfExtractionCandidate,
} from "./extract-from-pdf";
import { reconcileExtractions } from "./reconcile-extractions";

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

type PipelineCandidate = {
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseErrors: string[];
  warnings: string[];
  schemaUsed: "swiggy.body.v1" | "swiggy.docling.v1" | "swiggy.fallback.v1";
  dataSource: "EMAIL_BODY" | "PDF_ATTACHMENT";
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

  let bodyCandidate: PipelineCandidate | null = null;
  if (model) {
    const body = await extractFromEmailBody(emailData, model, {
      storeTransaction: false,
    });
    if (body.parseSuccess && body.extractionData?.transaction?.amount) {
      bodyCandidate = {
        extractionData: {
          ...body.extractionData,
          dataSource: "EMAIL_BODY",
        },
        extractionConfidence: body.extractionConfidence,
        parseErrors: body.parseErrors,
        warnings: [],
        schemaUsed: "swiggy.body.v1",
        dataSource: "EMAIL_BODY",
        contributedByPdf: false,
      };
    } else {
      parseErrors.push(...body.parseErrors);
    }
  }

  let pdfCandidate: PdfExtractionCandidate | null = null;
  for (const attachment of emailData.attachments || []) {
    if (attachment.mimeType !== "application/pdf" || !attachment.storageUrl) {
      continue;
    }

    const pdf = await extractFromPdf({
      emailData,
      attachmentPath: attachment.storageUrl,
    });
    if (pdf.ok) {
      pdfCandidate = pdf.value;
      break;
    }
    parseErrors.push(pdf.message);
  }

  let finalCandidate: PipelineCandidate | null = null;
  if (bodyCandidate && pdfCandidate) {
    finalCandidate = model
      ? await reconcileExtractions({
          body: bodyCandidate.extractionData,
          pdf: pdfCandidate.extractionData,
          model,
        })
      : pdfCandidate;
    parseErrors.push(...bodyCandidate.parseErrors, ...pdfCandidate.parseErrors);
  } else if (pdfCandidate) {
    finalCandidate = pdfCandidate;
  } else if (bodyCandidate) {
    finalCandidate = bodyCandidate;
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
    }
  }

  if (!finalCandidate || !finalCandidate.extractionData.transaction?.amount) {
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
      dataSource: finalCandidate.contributedByPdf
        ? "PDF_ATTACHMENT"
        : "EMAIL_BODY",
      isVerified: false,
    });
    transactionId = stored?.id;
  }

  return {
    ...finalCandidate,
    parseErrors: mergedErrors,
    parseSuccess: true,
    transactionId,
  };
}
