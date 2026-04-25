import { z } from "zod";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { EmailData } from "../types/slashAI";
import type { EmailPdfTextSource } from "./extract-from-email-body";

const SwiggyLineItemSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  amount: z.number().nullable(),
  discount: z.number().nullable(),
  netAmount: z.number().nullable(),
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

export type DeterministicSwiggyResult = {
  simple: DeterministicSwiggyExtraction;
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseSuccess: boolean;
  parseErrors: string[];
  dataSource: "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH";
  contributedByPdf: boolean;
};

export function extractSwiggyDeterministically(
  emailData: Pick<EmailData, "subject" | "body" | "date">,
  pdfTextSources: EmailPdfTextSource[] = [],
): DeterministicSwiggyResult {
  const pdfText = pdfTextSources.map((source) => source.text).join("\n\n");
  const pdfExtraction = extractSimpleFromPdf(emailData.subject, pdfText);
  const bodyExtraction = extractSimpleFromEmailBody(
    emailData.subject,
    emailData.body,
  );
  const simple = mergeSimpleExtraction(
    emailData.subject,
    pdfExtraction,
    bodyExtraction,
  );
  const extractionData = buildSwiggyExtraction(emailData, simple);
  const dataSource = resolveDataSource(simple, pdfTextSources.length > 0);

  return {
    simple,
    extractionData,
    extractionConfidence: extractionData.confidenceScore,
    parseSuccess: extractionData.parseSuccess,
    parseErrors: extractionData.parseErrors,
    dataSource,
    contributedByPdf: dataSource !== "EMAIL_BODY",
  };
}

function extractSimpleFromPdf(
  emailSubject: string,
  pdfText: string,
): DeterministicSwiggyExtraction {
  if (!pdfText.trim()) {
    return emptySimpleExtraction(emailSubject, [
      "No PDF invoice text was available.",
    ]);
  }

  const invoiceText = firstInvoiceText(pdfText);
  const lines = nonEmptyLines(invoiceText);
  const itemRows = parseInvoiceItemRows(lines);
  const orderId = valueAfterLabel(lines, "Order ID");
  const invoiceNo = valueAfterLabel(lines, "Invoice No");
  const restaurantName = stripTrailingGstin(
    valueAfterLabel(lines, "Restaurant Name") ??
      valueAfterLabel(lines, "Seller Name"),
  );
  const customerAddress = valueAfterLabel(lines, "Customer Address");
  const restaurantAddress = valueAfterLabel(lines, "Address");
  const invoiceDate = toIsoDate(valueAfterLabel(lines, "Date of Invoice"));
  const invoiceTotal =
    tableAmountByLabel(lines, "Invoice Total") ??
    tableAmountByAnyCell(lines, "Invoice Value");
  const itemSubtotal = tableSubtotal(lines);
  const taxTotal = tableAmountByLabel(lines, "Total taxes");
  const packagingFee =
    itemRows
      .filter((item) => /packing/i.test(item.name))
      .reduce((sum, item) => sum + (item.netAmount ?? item.amount ?? 0), 0) ||
    null;
  const discountTotal =
    itemRows.reduce((sum, item) => sum + (item.discount ?? 0), 0) || null;
  const parseSuccess = Boolean(orderId && invoiceTotal);

  return DeterministicSwiggyExtractionSchema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject,
    parseSuccess,
    confidenceScore: parseSuccess ? 0.99 : 0.2,
    orderId,
    invoiceNo,
    restaurantName,
    customerAddress,
    restaurantAddress,
    invoiceDate,
    invoiceTotal,
    paidAmount: null,
    itemSubtotal,
    taxTotal,
    platformFee: null,
    deliveryFee: null,
    packagingFee,
    discountTotal,
    paymentMethod: null,
    serviceType: /seller name|description of goods|instamaxx|instamart/i.test(
      invoiceText,
    )
      ? "INSTAMART"
      : /restaurant service/i.test(invoiceText)
        ? "FOOD_DELIVERY"
        : "UNKNOWN",
    items: itemRows,
    parseErrors: parseSuccess
      ? []
      : ["PDF text did not include both Order ID and Invoice Total."],
  });
}

function extractSimpleFromEmailBody(
  emailSubject: string,
  emailBody: string,
): DeterministicSwiggyExtraction {
  const orderId = emailBody.match(/\bOrder ID:\s*([A-Z0-9-]+)/i)?.[1] ?? null;
  const paid = emailBody.match(
    /\bPaid Via\s+(.+?)\s+₹\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
  );
  const paidAmount = paid?.[2] ? Number(paid[2]) : null;
  const paymentMethod = paid?.[1]?.trim() || null;
  const platformFee = amountAfterPhrase(emailBody, "Platform fee with GST");
  const deliveryFee = freeFeeAfterPhrase(emailBody, "Delivery Fee");
  const taxTotal = amountAfterPhrase(emailBody, "Taxes");
  const discountTotal = amountAfterPhrase(emailBody, "Discount Applied");
  const parseSuccess = Boolean(orderId && paidAmount);

  return DeterministicSwiggyExtractionSchema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject,
    parseSuccess,
    confidenceScore: parseSuccess ? 0.95 : 0,
    orderId,
    invoiceNo: null,
    restaurantName: null,
    customerAddress: null,
    restaurantAddress: null,
    invoiceDate: null,
    invoiceTotal: null,
    paidAmount,
    itemSubtotal: null,
    taxTotal,
    platformFee,
    deliveryFee,
    packagingFee: null,
    discountTotal,
    paymentMethod,
    serviceType: parseSuccess ? "FOOD_DELIVERY" : "UNKNOWN",
    items: [],
    parseErrors: parseSuccess
      ? []
      : ["Email body did not include both Order ID and paid amount."],
  });
}

function mergeSimpleExtraction(
  emailSubject: string,
  pdfExtraction: DeterministicSwiggyExtraction,
  bodyExtraction: DeterministicSwiggyExtraction,
): DeterministicSwiggyExtraction {
  const orderId = pdfExtraction.orderId ?? bodyExtraction.orderId ?? null;
  const invoiceTotal = pdfExtraction.invoiceTotal;
  const paidAmount = bodyExtraction.paidAmount ?? invoiceTotal;
  const parseSuccess = Boolean(orderId && paidAmount);
  const parseErrors = parseSuccess
    ? []
    : uniqueStrings([
        ...pdfExtraction.parseErrors,
        ...bodyExtraction.parseErrors,
      ]);

  return DeterministicSwiggyExtractionSchema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject,
    parseSuccess,
    confidenceScore: parseSuccess
      ? Math.max(pdfExtraction.confidenceScore, bodyExtraction.confidenceScore)
      : Math.max(pdfExtraction.confidenceScore, bodyExtraction.confidenceScore),
    orderId,
    invoiceNo: pdfExtraction.invoiceNo,
    restaurantName: pdfExtraction.restaurantName,
    customerAddress: pdfExtraction.customerAddress,
    restaurantAddress: pdfExtraction.restaurantAddress,
    invoiceDate: pdfExtraction.invoiceDate,
    invoiceTotal,
    paidAmount,
    itemSubtotal: pdfExtraction.itemSubtotal,
    taxTotal: pdfExtraction.taxTotal ?? bodyExtraction.taxTotal,
    platformFee: bodyExtraction.platformFee,
    deliveryFee: bodyExtraction.deliveryFee,
    packagingFee: pdfExtraction.packagingFee,
    discountTotal: bodyExtraction.discountTotal ?? pdfExtraction.discountTotal,
    paymentMethod: bodyExtraction.paymentMethod,
    serviceType:
      pdfExtraction.serviceType !== "UNKNOWN"
        ? pdfExtraction.serviceType
        : bodyExtraction.serviceType,
    items: pdfExtraction.items,
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
    dataSource: resolveDataSource(simple, Boolean(simple.invoiceTotal)),
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
            ...(simple.invoiceTotal && hasBodyContribution(simple)
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
                pincode: extractPincode(simple.customerAddress),
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
  simple: DeterministicSwiggyExtraction,
  hasPdfText: boolean,
): "EMAIL_BODY" | "PDF_ATTACHMENT" | "BOTH" {
  if (
    simple.paidAmount &&
    simple.invoiceTotal &&
    (simple.paymentMethod ||
      simple.platformFee !== null ||
      simple.deliveryFee !== null)
  ) {
    return "BOTH";
  }
  if (hasPdfText || simple.invoiceTotal) return "PDF_ATTACHMENT";
  return "EMAIL_BODY";
}

function hasBodyContribution(simple: DeterministicSwiggyExtraction): boolean {
  return Boolean(
    simple.paymentMethod ||
      simple.platformFee !== null ||
      simple.deliveryFee !== null,
  );
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

function firstInvoiceText(pdfText: string): string {
  const start = pdfText.search(/(^|\n)(#+\s*)?TAX INVOICE\b/i);
  const text = start >= 0 ? pdfText.slice(start) : pdfText;
  const endMarkers = [
    text.search(/\n#+\s*Details of ECO\b/i),
    text.search(/\nDetails of ECO\b/i),
    text.indexOf("\nTAX INVOICE", 20),
  ].filter((index) => index > 0);
  const end = endMarkers.length > 0 ? Math.min(...endMarkers) : text.length;
  return text.slice(0, end);
}

function nonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== "<!-- image -->");
}

function valueAfterLabel(lines: string[], label: string): string | null {
  const target = normalizeLabel(label);
  const index = lines.findIndex((line) => normalizeLabel(line) === target);
  if (index < 0) return null;

  const value = lines[index + 1];
  if (!value || looksLikeLabel(value) || value.startsWith("|")) return null;
  return value.trim();
}

function parseInvoiceItemRows(
  lines: string[],
): DeterministicSwiggyExtraction["items"] {
  const rows: DeterministicSwiggyExtraction["items"] = [];
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = markdownCells(line);
    const rowNumber = cells[0];
    if (!rowNumber || !/^\d+\.?$/.test(rowNumber)) continue;
    const name = cells[1];
    if (!name || /description/i.test(name)) continue;

    if (cells.length >= 16) {
      rows.push({
        name,
        quantity: numberFromText(cells[2]) ?? null,
        unitPrice: null,
        amount: moneyFromText(cells[5]) ?? null,
        discount: moneyFromText(cells[6]) ?? null,
        netAmount: moneyFromText(cells[15]) ?? null,
      });
      continue;
    }

    rows.push({
      name,
      quantity: numberFromText(cells[3]) ?? null,
      unitPrice: moneyFromText(cells[4]) ?? null,
      amount: moneyFromText(cells[5]) ?? null,
      discount: moneyFromText(cells[6]) ?? null,
      netAmount: moneyFromText(cells[7]) ?? null,
    });
  }
  return rows;
}

function markdownCells(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim().replace(/\s+/g, " "));
}

function tableAmountByLabel(lines: string[], label: string): number | null {
  const target = normalizeLabel(label);
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = markdownCells(line);
    if (normalizeLabel(cells[0] || "") !== target) continue;
    return amountFromCells(cells);
  }
  return null;
}

function tableAmountByAnyCell(lines: string[], label: string): number | null {
  const target = normalizeLabel(label);
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = markdownCells(line);
    const labelIndex = cells.findIndex(
      (cell) => normalizeLabel(cell) === target,
    );
    if (labelIndex < 0) continue;
    return amountFromCells(cells.slice(labelIndex + 1));
  }
  return null;
}

function tableSubtotal(lines: string[]): number | null {
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = markdownCells(line);
    if (!cells.some((cell) => normalizeLabel(cell) === "subtotal")) continue;
    return amountFromCells(cells);
  }
  return null;
}

function amountFromCells(cells: string[]): number | null {
  for (const cell of [...cells].reverse()) {
    const amount = moneyFromText(cell);
    if (amount !== null) return amount;
  }
  return null;
}

function amountAfterPhrase(text: string, phrase: string): number | null {
  const escaped = escapeRegExp(phrase);
  const match = text.match(
    new RegExp(
      `${escaped}[^₹\\d-]*-?\\s*₹?\\s*([0-9]+(?:\\.[0-9]{1,2})?)`,
      "i",
    ),
  );
  return match?.[1] ? Number(match[1]) : null;
}

function freeFeeAfterPhrase(text: string, phrase: string): number | null {
  const escaped = escapeRegExp(phrase);
  const match = text.match(
    new RegExp(
      `${escaped}[^₹]*₹\\s*([0-9]+(?:\\.[0-9]{1,2})?)(?:\\s*FREE)?`,
      "i",
    ),
  );
  if (!match?.[1]) return null;
  return /\bFREE\b/i.test(match[0]) ? 0 : Number(match[1]);
}

function moneyFromText(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const amount = Number(match[0]);
  return Number.isFinite(amount) ? amount : null;
}

function numberFromText(value: string | undefined): number | null {
  const amount = moneyFromText(value);
  return amount === null ? null : amount;
}

function normalizeLabel(value: string): string {
  return value.replace(/:$/, "").trim().toLowerCase();
}

function looksLikeLabel(value: string): boolean {
  return /:$/.test(value.trim());
}

function stripTrailingGstin(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/\s+\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i, "")
    .trim();
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const indianDate = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (indianDate) {
    const [, day, month, year] = indianDate;
    return `${year}-${month}-${day}`;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function locationFromAddress(address: string): Record<string, unknown> {
  return {
    address,
    city: /bengaluru|bangalore/i.test(address) ? "Bengaluru" : undefined,
    state: /karnataka/i.test(address) ? "Karnataka" : undefined,
    country: /india/i.test(address) ? "India" : undefined,
  };
}

function extractPincode(address: string): string | undefined {
  return address.match(/\b\d{6}\b/)?.[0];
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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
