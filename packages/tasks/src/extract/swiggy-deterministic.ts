import { z } from "zod";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { EmailData } from "../types/email-extraction";
import type { PdfExtractionSource } from "./extract-from-pdf";
import type { PdfExtraction } from "./pdf-extractor-schema";

const SwiggyLineItemSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  amount: z.number().nullable(),
  discount: z.number().nullable(),
  netAmount: z.number().nullable(),
  taxTotal: z.number().nullable(),
});

export const DeterministicSwiggyExtractionSchema = z.object({
  detectedProvider: z.literal("Swiggy"),
  emailType: z.enum(["ORDER_CONFIRMATION", "OTHER"]),
  emailSubject: z.string(),
  parseSuccess: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  orderId: z.string().nullable(),
  invoiceNo: z.string().nullable(),
  restaurantName: z.string().nullable(),
  customerAddress: z.string().nullable(),
  restaurantAddress: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  invoiceTotal: z.number().nullable(),
  paidAmount: z.number().nullable(),
  itemSubtotal: z.number().nullable(),
  taxTotal: z.number().nullable(),
  platformFee: z.number().nullable(),
  deliveryFee: z.number().nullable(),
  packagingFee: z.number().nullable(),
  discountTotal: z.number().nullable(),
  paymentMethod: z.string().nullable(),
  serviceType: z.enum([
    "FOOD_DELIVERY",
    "INSTAMART",
    "GENIE",
    "DINEOUT",
    "UNKNOWN",
  ]),
  items: z.array(SwiggyLineItemSchema),
  parseErrors: z.array(z.string()),
});

export type DeterministicSwiggyExtraction = z.infer<
  typeof DeterministicSwiggyExtractionSchema
>;

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

export type ExtractionProvenance = {
  parser: string;
  parserVersion: string;
  parsersUsed: string[];
  sourceQuality: "text" | "scanned" | "empty" | "encrypted" | "corrupted";
  warnings: string[];
  pdfAttachmentPath: string | null;
  extractedAt: string;
};

export type DeterministicSwiggyResult = {
  simple: DeterministicSwiggyExtraction;
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseSuccess: boolean;
  parseErrors: string[];
  dataSource: "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH";
  contributedByPdf: boolean;
  provenance: ExtractionProvenance | null;
};

export function extractSwiggyDeterministically(
  emailData: Pick<EmailData, "subject" | "body" | "date">,
  sources: PdfExtractionSource[] = [],
): DeterministicSwiggyResult {
  const primary = chooseBestExtraction(sources);
  const simple = primary
    ? toSimpleExtraction(emailData.subject, primary.extraction)
    : emptySimpleExtraction(emailData.subject, [
        "No deterministic Python extraction was available.",
      ]);
  const extractionData = buildSwiggyExtraction(emailData, simple);
  const dataSource = resolveDataSource(primary?.extraction, sources);

  return {
    simple,
    extractionData,
    extractionConfidence: extractionData.confidenceScore,
    parseSuccess: extractionData.parseSuccess,
    parseErrors: extractionData.parseErrors,
    dataSource,
    contributedByPdf: dataSource !== "EMAIL_BODY",
    provenance: primary ? toProvenance(primary) : null,
  };
}

function chooseBestExtraction(
  sources: PdfExtractionSource[],
): PdfExtractionSource | null {
  if (sources.length === 0) return null;
  return (
    [...sources].sort((left, right) => {
      const leftAmount =
        left.extraction.fields.paid_amount ??
        left.extraction.fields.invoice_total;
      const rightAmount =
        right.extraction.fields.paid_amount ??
        right.extraction.fields.invoice_total;
      if (leftAmount && !rightAmount) return -1;
      if (!leftAmount && rightAmount) return 1;
      return right.extraction.confidence - left.extraction.confidence;
    })[0] ?? null
  );
}

function toSimpleExtraction(
  emailSubject: string,
  extraction: PdfExtraction,
): DeterministicSwiggyExtraction {
  const fields = extraction.fields;
  const transactionAmount = fields.paid_amount ?? fields.invoice_total ?? null;
  const parseSuccess = Boolean(fields.order_id && transactionAmount);
  const parseErrors = parseSuccess
    ? []
    : extraction.source_quality.warnings.length > 0
      ? extraction.source_quality.warnings
      : ["No completed Swiggy transaction was found."];

  return DeterministicSwiggyExtractionSchema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject,
    parseSuccess,
    confidenceScore: parseSuccess ? extraction.confidence : 0,
    orderId: fields.order_id ?? null,
    invoiceNo: fields.invoice_no ?? null,
    restaurantName: fields.restaurant_name ?? null,
    customerAddress: fields.customer_address ?? null,
    restaurantAddress: fields.restaurant_address ?? null,
    invoiceDate: fields.invoice_date ?? null,
    invoiceTotal: fields.invoice_total ?? null,
    paidAmount: fields.paid_amount ?? null,
    itemSubtotal: fields.item_subtotal ?? null,
    taxTotal: fields.tax_total ?? null,
    platformFee: fields.platform_fee ?? null,
    deliveryFee: fields.delivery_fee ?? null,
    packagingFee: fields.packaging_fee ?? null,
    discountTotal: fields.discount_total ?? null,
    paymentMethod: fields.payment_method ?? null,
    serviceType: fields.service_type ?? "UNKNOWN",
    items: fields.items.map((item) => ({
      name: item.name,
      quantity: item.quantity ?? null,
      unitPrice: item.unit_price ?? null,
      amount: item.amount ?? null,
      discount: item.discount ?? null,
      netAmount: item.net_amount ?? null,
      taxTotal: item.tax_total ?? null,
    })),
    parseErrors,
  });
}

function buildSwiggyExtraction(
  emailData: Pick<EmailData, "subject" | "date">,
  simple: DeterministicSwiggyExtraction,
): SwiggyExtraction {
  const transactionAmount = simple.paidAmount ?? simple.invoiceTotal;
  const parseSuccess = Boolean(
    simple.parseSuccess && simple.orderId && transactionAmount,
  );
  return SwiggyMerchant.schema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject: emailData.subject,
    parseSuccess,
    parseErrors: parseSuccess
      ? []
      : simple.parseErrors.length > 0
        ? simple.parseErrors
        : ["No completed Swiggy transaction was found."],
    confidenceScore: parseSuccess ? simple.confidenceScore : 0,
    dataSource: resolveSimpleDataSource(simple),
    merchantId: SwiggyMerchant.id,
    merchantCode: SwiggyMerchant.code,
    transaction: parseSuccess
      ? {
          amount: transactionAmount,
          currency: "INR",
          type: "DEBIT",
          status: "COMPLETED",
          transactionDate: simple.invoiceDate
            ? new Date(`${simple.invoiceDate}T00:00:00.000Z`).toISOString()
            : emailData.date,
          description: `Swiggy order - ${simple.restaurantName || "Swiggy"}`,
          category: "Food",
          merchantName: simple.restaurantName || "Swiggy",
          merchantCategory: "Restaurant",
          paymentMethod: simple.paymentMethod ?? undefined,
          referenceIds: {
            ...(simple.invoiceNo ? { invoiceNo: simple.invoiceNo } : {}),
            ...(simple.orderId ? { orderId: simple.orderId } : {}),
            ...(simple.invoiceDate ? { invoiceDate: simple.invoiceDate } : {}),
            ...(simple.invoiceTotal && simple.paidAmount
              ? { restaurantInvoiceTotal: String(simple.invoiceTotal) }
              : {}),
          },
          location: simple.customerAddress
            ? locationFromAddress(simple.customerAddress)
            : undefined,
          orderId: simple.orderId,
          orderItems: simple.items.map(toSwiggyOrderItem),
          deliveryAddress: simple.customerAddress
            ? {
                fullAddress: simple.customerAddress,
                pincode: extractPincode(simple.customerAddress) || undefined,
              }
            : undefined,
          restaurantName: simple.restaurantName || undefined,
          deliveryFee: simple.deliveryFee ?? undefined,
          taxes: simple.taxTotal ?? undefined,
          discount: simple.discountTotal ?? undefined,
          packagingFee: simple.packagingFee ?? undefined,
          proStatus: false,
        }
      : undefined,
    swiggyMetadata: parseSuccess
      ? {
          service:
            simple.serviceType === "UNKNOWN"
              ? "FOOD_DELIVERY"
              : simple.serviceType,
          orderType: "DELIVERY",
        }
      : undefined,
  });
}

function resolveDataSource(
  extraction: PdfExtraction | undefined,
  sources: PdfExtractionSource[],
): "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH" {
  const hasPdf = sources.some((source) => source.attachmentPath);
  if (!hasPdf) return "EMAIL_BODY";
  if (
    extraction?.fields.paid_amount !== undefined &&
    extraction?.fields.paid_amount !== null
  ) {
    return "BOTH";
  }
  return "PDF_ATTACHMENT";
}

function resolveSimpleDataSource(
  simple: DeterministicSwiggyExtraction,
): "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH" {
  if (simple.paidAmount && simple.invoiceTotal) return "BOTH";
  if (simple.invoiceTotal) return "PDF_ATTACHMENT";
  return "EMAIL_BODY";
}

function toProvenance(source: PdfExtractionSource): ExtractionProvenance {
  return {
    parser: source.extraction.extractor,
    parserVersion: source.extraction.extractor_version,
    parsersUsed: source.extraction.source_quality.parsers_used,
    sourceQuality: source.extraction.source_quality.kind,
    warnings: source.extraction.source_quality.warnings,
    pdfAttachmentPath: source.attachmentPath,
    extractedAt: new Date().toISOString(),
  };
}

function emptySimpleExtraction(
  emailSubject: string,
  parseErrors: string[],
): DeterministicSwiggyExtraction {
  return {
    detectedProvider: "Swiggy",
    emailType: "OTHER",
    emailSubject,
    parseSuccess: false,
    confidenceScore: 0,
    orderId: null,
    invoiceNo: null,
    restaurantName: null,
    customerAddress: null,
    restaurantAddress: null,
    invoiceDate: null,
    invoiceTotal: null,
    paidAmount: null,
    itemSubtotal: null,
    taxTotal: null,
    platformFee: null,
    deliveryFee: null,
    packagingFee: null,
    discountTotal: null,
    paymentMethod: null,
    serviceType: "UNKNOWN",
    items: [],
    parseErrors,
  };
}

function locationFromAddress(address: string): Record<string, unknown> {
  return {
    address,
    city: /bengaluru|bangalore/i.test(address) ? "Bengaluru" : undefined,
    state: /karnataka/i.test(address) ? "Karnataka" : undefined,
    country: /india/i.test(address) ? "India" : undefined,
  };
}

function extractPincode(address: string): string | null {
  return address.match(/\b\d{6}\b/)?.[0] ?? null;
}

function toSwiggyOrderItem(
  item: DeterministicSwiggyExtraction["items"][number],
): Record<string, unknown> {
  return {
    name: item.name,
    quantity: positiveOrUndefined(item.quantity),
    price: positiveOrUndefined(item.unitPrice ?? item.netAmount ?? item.amount),
    customizations: [],
  };
}

function positiveOrUndefined(
  value: number | null | undefined,
): number | undefined {
  return typeof value === "number" && value > 0 ? value : undefined;
}
