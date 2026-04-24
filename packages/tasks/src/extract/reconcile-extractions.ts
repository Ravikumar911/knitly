import { generateObject, NoObjectGeneratedError, type LanguageModel } from "ai";
import { z } from "zod";
import { SwiggyMerchant } from "../merchants/swiggy";
import { SWIGGY_RECONCILIATION_RULES } from "../merchants/swiggy/prompt";
import { createAiAbortController } from "../utils/ai-timeout";

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

export type ReconciliationCandidate = {
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseErrors: string[];
  warnings: string[];
  schemaUsed: "swiggy.docling.v1";
  dataSource: "PDF_ATTACHMENT";
  contributedByPdf: true;
};

export async function reconcileExtractions(input: {
  body: SwiggyExtraction;
  pdf: SwiggyExtraction;
  model: LanguageModel;
}): Promise<ReconciliationCandidate> {
  const mismatch = hasAmountMismatch(input.body, input.pdf);
  const deterministic = deterministicMerge(input.body, input.pdf, mismatch);
  const abort = createAiAbortController();

  try {
    const { object } = await generateObject({
      model: input.model,
      schema: SwiggyMerchant.schema,
      schemaName: "SwiggyExtraction",
      schemaDescription: "A reconciled slash.cash Swiggy transaction result.",
      mode: "json",
      maxRetries: 0,
      abortSignal: abort.signal,
      temperature: 0,
      prompt: [
        "Reconcile these two Swiggy extraction candidates into one final object.",
        SWIGGY_RECONCILIATION_RULES.trim(),
        "EMAIL BODY CANDIDATE:",
        JSON.stringify(input.body, null, 2),
        "PDF CANDIDATE:",
        JSON.stringify(input.pdf, null, 2),
      ].join("\n\n"),
    });

    const parsed = SwiggyMerchant.schema.safeParse(object);
    if (!parsed.success) {
      return deterministic;
    }

    const merged = parsed.data;
    merged.dataSource = "BOTH";
    if (input.pdf.transaction?.amount !== undefined) {
      merged.transaction = {
        ...merged.transaction,
        ...input.pdf.transaction,
        amount: input.pdf.transaction.amount,
        orderId: input.pdf.transaction.orderId || merged.transaction?.orderId,
        transactionDate:
          input.body.transaction?.transactionDate ||
          input.pdf.transaction.transactionDate,
      };
    }
    if (mismatch) {
      merged.confidenceScore = Math.max(0.1, merged.confidenceScore / 2);
      merged.parseErrors = [...(merged.parseErrors || []), "amount mismatch"];
    }

    return {
      extractionData: merged,
      extractionConfidence: merged.confidenceScore,
      parseErrors: merged.parseErrors || [],
      warnings: mismatch ? ["amount mismatch"] : [],
      schemaUsed: "swiggy.docling.v1",
      dataSource: "PDF_ATTACHMENT",
      contributedByPdf: true,
    };
  } catch (error) {
    if (
      !NoObjectGeneratedError.isInstance(error) &&
      !(error instanceof Error)
    ) {
      return deterministic;
    }
    return deterministic;
  } finally {
    abort.clear();
  }
}

function deterministicMerge(
  body: SwiggyExtraction,
  pdf: SwiggyExtraction,
  mismatch: boolean,
): ReconciliationCandidate {
  const merged = SwiggyMerchant.schema.parse({
    ...body,
    parseSuccess: true,
    parseErrors: mismatch ? ["amount mismatch"] : [],
    confidenceScore: mismatch
      ? Math.max(0.1, pdf.confidenceScore / 2)
      : Math.max(body.confidenceScore, pdf.confidenceScore),
    dataSource: "BOTH",
    transaction: {
      ...body.transaction,
      ...pdf.transaction,
      amount: pdf.transaction?.amount ?? body.transaction?.amount ?? 0,
      orderId: pdf.transaction?.orderId || body.transaction?.orderId,
      transactionDate:
        body.transaction?.transactionDate || pdf.transaction?.transactionDate,
    },
  });

  return {
    extractionData: merged,
    extractionConfidence: merged.confidenceScore,
    parseErrors: merged.parseErrors || [],
    warnings: mismatch ? ["amount mismatch"] : [],
    schemaUsed: "swiggy.docling.v1",
    dataSource: "PDF_ATTACHMENT",
    contributedByPdf: true,
  };
}

function hasAmountMismatch(body: SwiggyExtraction, pdf: SwiggyExtraction) {
  const bodyAmount = body.transaction?.amount;
  const pdfAmount = pdf.transaction?.amount;
  if (
    bodyAmount === undefined ||
    pdfAmount === undefined ||
    bodyAmount <= 0 ||
    pdfAmount <= 0
  ) {
    return false;
  }

  return Math.abs(bodyAmount - pdfAmount) / pdfAmount > 0.01;
}
