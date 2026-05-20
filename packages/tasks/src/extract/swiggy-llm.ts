import { generateText } from "ai";
import { z } from "zod";
import { SwiggyMerchant } from "../merchants/swiggy";
import {
  SWIGGY_PROMPT,
  SWIGGY_RECONCILIATION_RULES,
} from "../merchants/swiggy/prompt";
import type { EmailData } from "../types/email-extraction";
import type { PdfExtractionSource } from "./extract-from-pdf";
import {
  extractSwiggyBodySignals,
  isSwiggyMarketingEmail,
} from "./swiggy-body-signals";
import {
  ExtractionModelUnavailable,
  resolveExtractionModel,
} from "./llm-model";
import type { ExtractionProvenance } from "./swiggy-deterministic";

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

const optionalString = z.preprocess(nullToUndefined, z.string().optional());
const optionalNumber = z.preprocess(nullToUndefined, z.number().optional());
const optionalService = z
  .preprocess(
    nullToUndefined,
    z.enum(["FOOD_DELIVERY", "INSTAMART", "GENIE", "DINEOUT"]).optional(),
  )
  .default("FOOD_DELIVERY");
const optionalOrderType = z
  .preprocess(
    nullToUndefined,
    z.enum(["DELIVERY", "PICKUP", "DINE_IN"]).optional(),
  )
  .default("DELIVERY");

const LlmSwiggyItemSchema = z.object({
  name: optionalString,
  quantity: optionalNumber,
  price: optionalNumber,
});

const LlmSwiggyExtractionSchema = z.object({
  parseSuccess: z.boolean(),
  // Anthropic's OpenAI-compatible structured-output endpoint rejects JSON
  // Schema number bounds, so clamp this after generation instead.
  confidenceScore: z.number(),
  parseErrors: z.array(z.string()).default([]),
  orderId: optionalString,
  amount: optionalNumber,
  currency: optionalString.default("INR"),
  transactionDate: optionalString,
  description: optionalString,
  restaurantName: optionalString,
  paymentMethod: optionalString,
  invoiceNo: optionalString,
  invoiceDate: optionalString,
  customerAddress: optionalString,
  pincode: optionalString,
  deliveryFee: optionalNumber,
  taxes: optionalNumber,
  discount: optionalNumber,
  packagingFee: optionalNumber,
  orderItems: z.array(LlmSwiggyItemSchema).default([]),
  service: optionalService,
  orderType: optionalOrderType,
});

type LlmSwiggyExtraction = z.infer<typeof LlmSwiggyExtractionSchema>;

export type LlmSwiggyResult = {
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseSuccess: boolean;
  parseErrors: string[];
  dataSource: "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH";
  contributedByPdf: boolean;
  provenance: ExtractionProvenance | null;
};

export type SwiggyLlmDiagnosticOk = {
  ok: true;
  rawObject: LlmSwiggyExtraction;
  usage: unknown;
  result: LlmSwiggyResult;
};

export type SwiggyLlmDiagnosticErr = {
  ok: false;
  reason: string;
  result: LlmSwiggyResult;
};

export async function extractSwiggyWithLlmDiagnostic(
  emailData: Pick<EmailData, "subject" | "body" | "date">,
  sources: PdfExtractionSource[] = [],
): Promise<SwiggyLlmDiagnosticOk | SwiggyLlmDiagnosticErr> {
  const pdfText = buildPdfTextBlock(sources);
  const dataSource = resolveDataSource(pdfText, emailData.body);
  const provenance = sources.length > 0 ? toProvenance(sources) : null;

  let resolved: ReturnType<typeof resolveExtractionModel>;
  try {
    resolved = resolveExtractionModel();
  } catch (error) {
    if (error instanceof ExtractionModelUnavailable) {
      return {
        ok: false,
        reason: `Extraction model unavailable: ${error.reason}.`,
        result: emptyLlmResult(emailData, dataSource, provenance, [
          `Extraction model unavailable: ${error.reason}.`,
        ]),
      };
    }
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : "Extraction model could not be resolved.",
      result: emptyLlmResult(emailData, dataSource, provenance, [
        error instanceof Error
          ? error.message
          : "Extraction model could not be resolved.",
      ]),
    };
  }

  try {
    const { object, usage } = await runSwiggyGenerateObject(
      emailData,
      pdfText,
      resolved,
    );
    return {
      ok: true,
      rawObject: object,
      usage,
      result: normalizeExtraction(emailData, object, dataSource, provenance),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LLM extraction failed.";
    return {
      ok: false,
      reason: message,
      result: emptyLlmResult(emailData, dataSource, provenance, [message]),
    };
  }
}

export async function extractSwiggyWithLlm(
  emailData: Pick<EmailData, "subject" | "body" | "date">,
  sources: PdfExtractionSource[] = [],
): Promise<LlmSwiggyResult> {
  const diagnostic = await extractSwiggyWithLlmDiagnostic(emailData, sources);
  return diagnostic.result;
}

const TIGHTENED_SWIGGY_SYSTEM_PROMPT = `${SWIGGY_PROMPT}

STRICTNESS RULES:
- Extract only what is explicitly stated in the PDF text or email body.
- If a field is unknown, omit it or return null when the schema permits null.
- Do not invent amounts, order IDs, restaurants, items, addresses, or payment methods.
- transaction.amount is what the customer paid. Use email body "Paid Via ... ₹X", "Grand Total ₹X", or "Order Total ₹X".
- Never use the PDF "Invoice Total" as transaction.amount when the email body states a different final paid amount.
- "Saved", standalone discount rows, and PDF restaurant subtotals are not transaction.amount.
- When the email body contains "Paid Via ... ₹X", use X as transaction.amount and the phrase after "Paid Via" as paymentMethod.
- Swiggy delivery confirmation emails with Order ID and a final paid amount are valid completed orders. Parse them as parseSuccess=true.
- Instamart and Gourmet receipts follow the same rule: Order ID + final paid amount in the email body means parseSuccess=true.
- If final amount paid is not stated anywhere in the email body, set parseSuccess=false.
- If the Swiggy order ID is not stated, set parseSuccess=false.
- Prefer PDF text for invoice fields and itemized details.
- Prefer email body for final paid amount and payment method when stated.
- PDF invoice total can differ from email paid amount because the PDF covers restaurant charges only. That is expected.
- The invoice phrase "Restaurant Service" means food delivery, not DINEOUT.
- Use DINEOUT only when the email explicitly says Dineout, dining out, table booking, or restaurant booking.
- Return parseSuccess=false for marketing, coupon-only, or promotional email without Order ID and without a final paid amount.
${SWIGGY_RECONCILIATION_RULES}`;

function compactPdfText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const anchor = trimmed.slice(0, Math.min(240, trimmed.length));
  const secondMatch = trimmed.indexOf(anchor, anchor.length);
  if (secondMatch > 0) {
    return trimmed.slice(0, secondMatch).trim();
  }

  const blocks = trimmed.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const seen = new Set<string>();
  const uniqueBlocks: string[] = [];
  for (const block of blocks) {
    const key = block.replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueBlocks.push(block);
  }
  return uniqueBlocks.join("\n\n");
}

function buildPdfTextBlock(sources: PdfExtractionSource[]): string {
  return sources
    .map((source, index) =>
      source.text.trim()
        ? `PDF SOURCE ${index + 1} (${source.attachmentPath || "body-only"}):\n${compactPdfText(source.text)}`
        : "",
    )
    .filter(Boolean)
    .join("\n\n---\n\n");
}

async function runSwiggyGenerateObject(
  emailData: Pick<EmailData, "subject" | "body" | "date">,
  pdfText: string,
  resolved: ReturnType<typeof resolveExtractionModel>,
) {
  const result = await generateText({
    model: resolved.model,
    system: TIGHTENED_SWIGGY_SYSTEM_PROMPT,
    prompt: buildPrompt({
      subject: emailData.subject,
      emailDate: emailData.date,
      emailBody: emailData.body,
      pdfText,
    }),
    temperature: 0,
    maxRetries: 2,
    maxOutputTokens: 2_000,
    abortSignal: AbortSignal.timeout(
      resolveLlmTimeoutMs(resolved.config.provider),
    ),
  });
  const parsed = LlmSwiggyExtractionSchema.safeParse(
    parseJsonObject(result.text),
  );
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }
  return { object: parsed.data, usage: result.usage };
}

function buildPrompt(input: {
  subject: string;
  emailDate: string;
  emailBody: string;
  pdfText: string;
}) {
  return [
    `Email subject: ${input.subject || "(empty)"}`,
    `Email received date: ${input.emailDate || "(unknown)"}`,
    "",
    "Return one JSON object only. Use this shape:",
    clip(JSON.stringify(LLM_JSON_CONTRACT, null, 2), 2_000),
    "",
    "PDF text:",
    clip(input.pdfText || "(no PDF text)", resolveMaxPdfTextChars()),
    "",
    "Email body:",
    clip(input.emailBody || "(empty)", resolveMaxEmailBodyChars()),
  ].join("\n");
}

const LLM_JSON_CONTRACT = {
  parseSuccess: "boolean",
  confidenceScore: "number from 0 to 1",
  parseErrors: ["string"],
  orderId: "string if found",
  amount: "number final paid amount if found",
  currency: "INR",
  transactionDate: "ISO date string if found",
  description: "short transaction description",
  restaurantName: "restaurant or store name if found",
  paymentMethod: "payment method if found",
  invoiceNo: "invoice number if found",
  invoiceDate: "invoice date if found",
  customerAddress: "customer delivery address if found",
  pincode: "delivery pincode if found",
  deliveryFee: "number if charged",
  taxes: "number if found",
  discount: "number if found",
  packagingFee: "number if found",
  orderItems: [{ name: "string", quantity: "number", price: "number" }],
  service: "FOOD_DELIVERY | INSTAMART | GENIE | DINEOUT",
  orderType: "DELIVERY | PICKUP | DINE_IN",
};

function normalizeExtraction(
  emailData: Pick<EmailData, "subject" | "body" | "date">,
  generated: LlmSwiggyExtraction,
  dataSource: LlmSwiggyResult["dataSource"],
  provenance: ExtractionProvenance | null,
): LlmSwiggyResult {
  if (isSwiggyMarketingEmail(emailData.subject, emailData.body)) {
    return emptyLlmResult(emailData, dataSource, provenance, [
      "Email appears to be marketing rather than a completed Swiggy order.",
    ]);
  }

  const bodySignals = extractSwiggyBodySignals({
    subject: emailData.subject,
    body: emailData.body,
  });
  const orderId = cleanString(generated.orderId) ?? bodySignals.orderId;
  const amount =
    positiveOrUndefined(generated.amount) ?? bodySignals.amount ?? undefined;
  const paymentMethod =
    cleanString(generated.paymentMethod) ?? bodySignals.paymentMethod ?? undefined;
  const restaurantName =
    cleanString(generated.restaurantName) ?? bodySignals.restaurant ?? undefined;

  const referenceIds: Record<string, string> = {};
  if (orderId) {
    referenceIds.orderId = orderId;
  }
  if (generated.invoiceNo) referenceIds.invoiceNo = generated.invoiceNo;
  if (generated.invoiceDate) referenceIds.invoiceDate = generated.invoiceDate;

  const parseErrors = [...(generated.parseErrors ?? [])];
  if (!orderId) {
    parseErrors.push("Extraction did not include a Swiggy order ID.");
  }
  if (!amount) {
    parseErrors.push("Extraction did not include a final paid amount.");
  }

  const parseSuccess = Boolean(orderId && amount);
  const confidence =
    parseSuccess && orderId && amount
      ? reconcileConfidence({
          llmConfidence: clampConfidence(generated.confidenceScore),
          amount,
          bodyAmount: bodySignals.amount,
          orderId,
          bodyOrderId: bodySignals.orderId,
          llmParseSuccess: generated.parseSuccess,
        })
      : 0;

  const extractionData = SwiggyMerchant.schema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject: emailData.subject,
    parseSuccess,
    parseErrors: parseSuccess ? [] : unique(parseErrors),
    confidenceScore: parseSuccess ? confidence : 0,
    dataSource,
    merchantId: SwiggyMerchant.id,
    merchantCode: SwiggyMerchant.code,
    transaction: parseSuccess
      ? {
          amount,
          orderId,
          referenceIds,
          currency: generated.currency || "INR",
          type: "DEBIT",
          status: "COMPLETED",
          transactionDate: validDateString(generated.transactionDate)
            ? generated.transactionDate
            : emailData.date,
          category: "Food",
          description:
            generated.description ||
            `Swiggy order - ${restaurantName || "Swiggy"}`,
          merchantName: restaurantName || "Swiggy",
          merchantCategory: "Restaurant",
          paymentMethod: paymentMethod ?? undefined,
          restaurantName: restaurantName ?? undefined,
          deliveryAddress:
            generated.customerAddress || generated.pincode
              ? {
                  fullAddress: generated.customerAddress ?? undefined,
                  pincode: generated.pincode ?? undefined,
                }
              : undefined,
          deliveryFee: positiveOrUndefined(generated.deliveryFee),
          taxes: positiveOrUndefined(generated.taxes),
          discount: positiveOrUndefined(generated.discount),
          packagingFee: positiveOrUndefined(generated.packagingFee),
          orderItems: generated.orderItems.flatMap((item) => {
            const name = cleanString(item.name);
            if (!name) return [];
            return [
              {
                name,
                quantity: positiveOrUndefined(item.quantity),
                price: positiveOrUndefined(item.price),
                customizations: [],
              },
            ];
          }),
          proStatus: false,
        }
      : undefined,
    swiggyMetadata: parseSuccess
      ? {
          service: generated.service || "FOOD_DELIVERY",
          orderType: generated.orderType || "DELIVERY",
        }
      : undefined,
  });

  return {
    extractionData,
    extractionConfidence: extractionData.confidenceScore,
    parseSuccess: extractionData.parseSuccess,
    parseErrors: extractionData.parseErrors,
    dataSource,
    contributedByPdf: dataSource !== "EMAIL_BODY",
    provenance,
  };
}

function reconcileConfidence(input: {
  llmConfidence: number;
  amount: number;
  bodyAmount: number | null;
  orderId: string;
  bodyOrderId: string | null;
  llmParseSuccess: boolean;
}) {
  let confidence = Math.max(input.llmConfidence, 0.85);
  if (input.bodyAmount != null && Math.abs(input.bodyAmount - input.amount) < 0.01) {
    confidence = Math.max(confidence, 0.95);
  }
  if (input.bodyOrderId && input.bodyOrderId === input.orderId) {
    confidence = Math.max(confidence, 0.95);
  }
  if (!input.llmParseSuccess && input.bodyAmount != null && input.bodyOrderId) {
    confidence = Math.max(confidence, 0.9);
  }
  return Math.min(1, confidence);
}

function emptyLlmResult(
  emailData: Pick<EmailData, "subject">,
  dataSource: LlmSwiggyResult["dataSource"],
  provenance: ExtractionProvenance | null,
  parseErrors: string[],
): LlmSwiggyResult {
  return {
    extractionData: SwiggyMerchant.schema.parse({
      detectedProvider: "Swiggy",
      emailType: "OTHER",
      emailSubject: emailData.subject,
      parseSuccess: false,
      parseErrors,
      confidenceScore: 0,
      dataSource,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
    }),
    extractionConfidence: 0,
    parseSuccess: false,
    parseErrors,
    dataSource,
    contributedByPdf: dataSource !== "EMAIL_BODY",
    provenance,
  };
}

function resolveDataSource(
  pdfText: string,
  emailBody: string,
): LlmSwiggyResult["dataSource"] {
  const hasPdf = Boolean(pdfText.trim());
  const hasBody = Boolean(emailBody.trim());
  if (hasPdf && hasBody) return "BOTH";
  if (hasPdf) return "PDF_ATTACHMENT";
  return "EMAIL_BODY";
}

function toProvenance(sources: PdfExtractionSource[]): ExtractionProvenance {
  const primary =
    sources.find((source) => source.attachmentPath) ?? sources[0]!;
  return {
    parser: "swiggy-llm",
    parserVersion: "1",
    parsersUsed: unique(
      sources.flatMap((source) => [
        source.extractor,
        ...source.sourceQuality.parsers_used,
      ]),
    ),
    sourceQuality: primary.sourceQuality.kind,
    warnings: unique(sources.flatMap((source) => source.warnings)),
    pdfAttachmentPath: primary.attachmentPath,
    extractedAt: new Date().toISOString(),
  };
}

function clip(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n[truncated ${value.length - maxChars} chars]`;
}

function clampConfidence(value: number | null | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveOrUndefined(
  value: number | null | undefined,
): number | undefined {
  return typeof value === "number" && value > 0 ? value : undefined;
}

function validDateString(value: string | null | undefined) {
  return Boolean(value && Number.isFinite(new Date(value).getTime()));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function nullToUndefined(value: unknown) {
  return value === null ? undefined : value;
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("LLM response did not contain a JSON object.");
  }
}

function resolveLlmTimeoutMs(provider: string) {
  const configured = Number(process.env.SLASHCASH_EXTRACT_LLM_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : provider === "ollama-local"
      ? 300_000
      : 120_000;
}

function resolveMaxPdfTextChars() {
  const configured = Number(process.env.SLASHCASH_EXTRACT_LLM_PDF_CHARS);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : 8_000;
}

function resolveMaxEmailBodyChars() {
  const configured = Number(process.env.SLASHCASH_EXTRACT_LLM_BODY_CHARS);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : 8_000;
}
