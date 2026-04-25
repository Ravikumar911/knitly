/**
 * Manual: fetch latest 5 Swiggy emails over IMAP, extract PDF attachment text,
 * and send email body + PDF text to Ollama through AI SDK generateObject.
 *
 * pnpm --filter @workspace/tasks manual:order-extract
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { performance } from "node:perf_hooks";
import { generateObject } from "ai";
import { z } from "zod";
import { defaultModel } from "../src/ai/model";
import { extractPdf } from "../src/extract/pdf-extractor";
import {
  fetchMessage,
  listMessages,
  type FetchedImapMessage,
  type ParsedImapAttachment,
} from "../src/gmail/imap-client";
import { SwiggyMerchant } from "../src/merchants/swiggy";
import { createAiAbortController } from "../src/utils/ai-timeout";

const MAX_EMAILS = 5;
const SWIGGY_GMAIL_QUERY = "from:(swiggy.in OR swiggy.com) newer_than:180d";
const OLLAMA_MODEL = "gemma3n:e4b";
const MAX_EMAIL_BODY_CHARS = 12_000;
const USE_DETERMINISTIC_REPAIR = !process.argv.includes(
  "--no-deterministic-repair",
);

const SimpleSwiggyItemSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  amount: z.number().nullable(),
  discount: z.number().nullable(),
  netAmount: z.number().nullable(),
});

const SimpleSwiggyExtractionSchema = z.object({
  detectedProvider: z.literal("Swiggy"),
  emailType: z.enum(["ORDER_CONFIRMATION", "OTHER"]),
  emailSubject: z.string(),
  parseSuccess: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  orderId: z.string().nullable(),
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
  items: z.array(SimpleSwiggyItemSchema),
  parseErrors: z.array(z.string()),
});

type SimpleSwiggyExtraction = z.infer<typeof SimpleSwiggyExtractionSchema>;
type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

type GmailCredentials = {
  address: string;
  appPassword: string;
};

type ExtractedPdfAttachment = {
  filename: string;
  mimeType: string;
  byteLength: number;
  ok: boolean;
  text: string;
  elapsedMs: number;
  error?: string;
};

type EmailTiming = {
  fetchMs: number;
  pdfExtractMs: number;
  aiMs: number;
  totalMs: number;
};

type EmailRunResult = {
  index: number;
  uid: string;
  subject: string;
  hasPdf: boolean;
  pdfExtractionOk: boolean;
  aiExtractionOk: boolean;
  finalSchemaOk: boolean;
  parseSuccess: boolean;
  orderId?: string;
  amount?: number;
  restaurantName?: string;
  failureReason?: string;
};

function ensureRuntimeEnv(): void {
  process.env.SLASHCASH_HOME ||= join(homedir(), ".slashcash");
  process.env.OLLAMA_CHAT_MODEL ||= OLLAMA_MODEL;
  process.env.SLASHCASH_AI_EXTRACTION_TIMEOUT_MS ||= "120000";

  const credentials = loadCredentials();
  process.env.SLASHCASH_GMAIL_ADDRESS = credentials.address;
  process.env.SLASHCASH_GMAIL_APP_PASSWORD = credentials.appPassword;
}

function loadCredentials(): GmailCredentials {
  const envAddress = (process.env.SLASHCASH_GMAIL_ADDRESS || "").trim();
  const envAppPassword = (
    process.env.SLASHCASH_GMAIL_APP_PASSWORD || ""
  ).replace(/\s+/g, "");
  if (envAddress && envAppPassword) {
    return { address: envAddress, appPassword: envAppPassword };
  }

  const credentialsPath = join(homedir(), ".slashcash", "credentials.json");
  const parsed = JSON.parse(readFileSync(credentialsPath, "utf8")) as unknown;
  const address = firstStringAt(parsed, [
    ["gmail", "address"],
    ["gmail", "email"],
    ["address"],
    ["email"],
  ]);
  const appPassword = firstStringAt(parsed, [
    ["gmail", "appPassword"],
    ["gmail", "app_password"],
    ["gmail", "password"],
    ["appPassword"],
    ["app_password"],
    ["password"],
  ])?.replace(/\s+/g, "");

  if (!address || !appPassword) {
    throw new Error(
      `Could not find Gmail address/app password in ${credentialsPath}.`,
    );
  }

  return { address: address.trim(), appPassword };
}

function firstStringAt(
  value: unknown,
  paths: Array<readonly string[]>,
): string | undefined {
  for (const path of paths) {
    const found = stringAt(value, path);
    if (found) return found;
  }
  return undefined;
}

function stringAt(value: unknown, path: readonly string[]): string | undefined {
  let current = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return typeof current === "string" && current.trim() ? current : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function main(): Promise<void> {
  ensureRuntimeEnv();

  logSection("Manual Swiggy IMAP Extract");
  console.log(`Gmail query: ${SWIGGY_GMAIL_QUERY}`);
  console.log(`Email limit: ${MAX_EMAILS}`);
  console.log(`Ollama model: ${process.env.OLLAMA_CHAT_MODEL}`);
  console.log(
    `Ollama base URL: ${process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1"}`,
  );
  console.log(
    `Deterministic repair: ${USE_DETERMINISTIC_REPAIR ? "enabled" : "disabled"}`,
  );

  const listStartedAt = performance.now();
  const listed = await listMessages(SWIGGY_GMAIL_QUERY, MAX_EMAILS);
  const listMs = elapsedSince(listStartedAt);
  if (!listed.ok) {
    throw new Error(listed.message);
  }

  console.log(
    `Found ${listed.data.length} Swiggy email(s) in ${formatMs(listMs)}.`,
  );
  if (listed.data.length === 0) return;

  const results: EmailRunResult[] = [];
  for (const [index, ref] of listed.data.entries()) {
    try {
      results.push(await processEmail(index + 1, ref.id));
    } catch (error) {
      logSection(
        `Email ${index + 1}/${MAX_EMAILS} Failed - IMAP UID ${ref.id}`,
      );
      console.log(formatUnknownError(error));
      console.log("Continuing to next email.");
      results.push({
        index: index + 1,
        uid: ref.id,
        subject: "<fetch failed>",
        hasPdf: false,
        pdfExtractionOk: false,
        aiExtractionOk: false,
        finalSchemaOk: false,
        parseSuccess: false,
        failureReason: formatUnknownError(error),
      });
    }
  }

  logRunSummary(results);
}

async function processEmail(
  index: number,
  uid: string,
): Promise<EmailRunResult> {
  const totalStartedAt = performance.now();

  logSection(`Email ${index}/${MAX_EMAILS} - IMAP UID ${uid}`);

  const fetchStartedAt = performance.now();
  const fetched = await fetchMessage(uid);
  const fetchMs = elapsedSince(fetchStartedAt);
  if (!fetched.ok) {
    console.log(`Fetch failed in ${formatMs(fetchMs)}: ${fetched.message}`);
    return {
      index,
      uid,
      subject: "<fetch failed>",
      hasPdf: false,
      pdfExtractionOk: false,
      aiExtractionOk: false,
      finalSchemaOk: false,
      parseSuccess: false,
      failureReason: fetched.message,
    };
  }

  const message = fetched.data;
  const emailBody = compactEmailBody(message);
  logEmail(message, fetchMs, emailBody);

  const pdfStartedAt = performance.now();
  const extractedPdfs = await extractPdfAttachments(message.attachments);
  const pdfExtractMs = elapsedSince(pdfStartedAt);
  logPdfOutput(extractedPdfs, pdfExtractMs);

  const pdfText = extractedPdfs
    .map((attachment, attachmentIndex) =>
      [
        `PDF_ATTACHMENT_${attachmentIndex + 1}: ${attachment.filename}`,
        attachment.text.trim() || "<empty>",
      ].join("\n"),
    )
    .join("\n\n");

  const prompt = buildPrompt(message, emailBody, pdfText);
  logPrompt(prompt);

  const aiStartedAt = performance.now();
  let aiMs = 0;
  let aiOutput: SimpleSwiggyExtraction | null = null;
  let aiError: string | undefined;
  try {
    const output = await runGenerateObject(prompt, message, emailBody, pdfText);
    aiMs = elapsedSince(aiStartedAt);
    aiOutput = output;
    logAiOutput(output, aiMs);
  } catch (error) {
    aiMs = elapsedSince(aiStartedAt);
    aiError = formatUnknownError(error);
    logAiFailure(error, aiMs);
  }

  const pdfExtraction = extractSimpleFromPdf(message, pdfText);
  const bodyExtraction = extractSimpleFromEmailBody(message, emailBody);
  const finalSimple = mergeSimpleExtraction(
    message,
    pdfExtraction,
    bodyExtraction,
    aiOutput,
  );
  const final = buildSwiggyExtraction(message, finalSimple);
  const finalParsed = SwiggyMerchant.schema.safeParse(final);
  logFinalExtraction(final, finalParsed);

  const timings: EmailTiming = {
    fetchMs,
    pdfExtractMs,
    aiMs,
    totalMs: elapsedSince(totalStartedAt),
  };
  logTimings(timings);

  const transaction = finalParsed.success
    ? finalParsed.data.transaction
    : undefined;
  return {
    index,
    uid,
    subject: message.subject,
    hasPdf: extractedPdfs.length > 0,
    pdfExtractionOk:
      extractedPdfs.length === 0 ||
      extractedPdfs.every((attachment) => attachment.ok),
    aiExtractionOk: Boolean(aiOutput),
    finalSchemaOk: finalParsed.success,
    parseSuccess: finalParsed.success && finalParsed.data.parseSuccess,
    orderId: transaction?.orderId,
    amount: transaction?.amount,
    restaurantName: transaction?.restaurantName,
    failureReason: finalParsed.success
      ? aiError
      : finalParsed.error.errors
          .map((error) => `${error.path.join(".")}: ${error.message}`)
          .join("; "),
  };
}

function logEmail(
  message: FetchedImapMessage,
  fetchMs: number,
  emailBody: string,
): void {
  console.log(`Fetched in ${formatMs(fetchMs)}`);
  console.log(`From: ${message.from}`);
  console.log(`Subject: ${message.subject}`);
  console.log(`Date: ${message.date}`);
  console.log(`Plain body chars: ${message.text.length}`);
  console.log(`HTML body chars: ${message.html.length}`);
  console.log(`Attachment count: ${message.attachments.length}`);

  for (const [index, attachment] of message.attachments.entries()) {
    console.log(
      `  ${index + 1}. ${attachment.filename} | ${attachment.mimeType} | ${formatBytes(attachment.content.length)}`,
    );
  }

  console.log("\nEMAIL BODY INPUT:");
  console.log(emailBody || "<empty>");
}

async function extractPdfAttachments(
  attachments: ParsedImapAttachment[],
): Promise<ExtractedPdfAttachment[]> {
  const pdfs = attachments.filter(isPdfAttachment);
  if (pdfs.length === 0) {
    console.log("\nNo PDF attachments found on this email.");
    return [];
  }

  const tempDir = mkdtempSync(join(tmpdir(), "slashcash-swiggy-"));
  try {
    const extracted: ExtractedPdfAttachment[] = [];
    for (const [index, attachment] of pdfs.entries()) {
      const startedAt = performance.now();
      const filename = safeAttachmentFilename(attachment.filename, index);
      const path = join(tempDir, filename);
      writeFileSync(path, attachment.content);

      const result = await extractPdf(path, { timeoutMs: 60_000 });
      const elapsedMs = elapsedSince(startedAt);
      if (result.ok) {
        extracted.push({
          filename,
          mimeType: attachment.mimeType,
          byteLength: attachment.content.length,
          ok: true,
          text: result.value.raw.text.trim(),
          elapsedMs,
        });
      } else {
        extracted.push({
          filename,
          mimeType: attachment.mimeType,
          byteLength: attachment.content.length,
          ok: false,
          text: "",
          elapsedMs,
          error: `${result.error.code}: ${result.error.message}`,
        });
      }
    }
    return extracted;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function isPdfAttachment(attachment: ParsedImapAttachment): boolean {
  return (
    attachment.mimeType === "application/pdf" ||
    /pdf/i.test(attachment.mimeType) ||
    /\.pdf$/i.test(attachment.filename)
  );
}

function safeAttachmentFilename(filename: string, index: number): string {
  const fallback = `attachment-${index + 1}.pdf`;
  const safeBase = basename(filename || fallback)
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!safeBase || safeBase === "." || safeBase === "..") {
    return fallback;
  }

  return safeBase;
}

function logPdfOutput(
  attachments: ExtractedPdfAttachment[],
  totalMs: number,
): void {
  logSection("PDF Extractor Output");
  console.log(`PDF extraction total: ${formatMs(totalMs)}`);
  if (attachments.length === 0) {
    console.log("<none>");
    return;
  }

  for (const [index, attachment] of attachments.entries()) {
    console.log(
      `${index + 1}. ${attachment.filename} | ${attachment.mimeType} | ${formatBytes(attachment.byteLength)} | ${attachment.ok ? "ok" : "failed"} | ${formatMs(attachment.elapsedMs)}`,
    );
    if (attachment.error) {
      console.log(`Error: ${attachment.error}`);
    }
    console.log("\nEXTRACTED PDF STRING:");
    console.log(attachment.text || "<empty>");
  }
}

function compactEmailBody(message: FetchedImapMessage): string {
  const body = message.text.trim() || textFromHtml(message.html);
  if (body.length <= MAX_EMAIL_BODY_CHARS) {
    return body;
  }

  return body.slice(0, MAX_EMAIL_BODY_CHARS).trim();
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function buildPrompt(
  message: FetchedImapMessage,
  emailBody: string,
  pdfText: string,
): string {
  return `You extract a single Swiggy invoice/order into a small JSON object.

Use these exact camelCase JSON keys only:
detectedProvider, emailType, emailSubject, parseSuccess, confidenceScore,
orderId, restaurantName, customerAddress, restaurantAddress, invoiceDate,
invoiceTotal, paidAmount, itemSubtotal, taxTotal, platformFee, deliveryFee,
packagingFee, discountTotal, paymentMethod, serviceType, items, parseErrors.

Rules:
- detectedProvider must be "Swiggy".
- emailType must be "ORDER_CONFIRMATION" for a real order/invoice, otherwise "OTHER".
- parseSuccess is true only when an orderId and a paidAmount or invoiceTotal are present.
- serviceType is usually "FOOD_DELIVERY" for Restaurant Service invoices.
- invoiceTotal is the restaurant PDF Invoice Total.
- paidAmount is the actual customer paid amount from "Paid Via ..." in the email body.
- itemSubtotal is the Subtotal / net assessable value before taxes.
- taxTotal is Total taxes.
- platformFee comes from "Platform fee with GST".
- deliveryFee is 0 when the email says the delivery fee is FREE.
- packagingFee comes from "Order Packing Charges".
- discountTotal is the sum of item row discounts.
- paymentMethod comes from the text after "Paid Via".
- Do not invent delivery partner or delivery time if absent.
- A Swiggy purchase is money spent by the user; downstream transaction type will be DEBIT.
- If the sources are marketing/promotional only, return parseSuccess false, emailType "OTHER", null numeric/detail fields, items [], and parseErrors explaining why.

SOURCE WORKFLOW:
- You receive exactly two source strings: the plain email body and the PDF extractor text.
- Use only these sources.
- Prefer PDF text when it contains invoice/order details.
- Return one flat JSON object that matches the small schema.

EMAIL:
FROM: ${message.from}
SUBJECT: ${message.subject}
DATE: ${message.date}

EMAIL BODY:
${emailBody || "<empty>"}

EXTRACTED PDF STRING:
${pdfText || "<none>"}
`;
}

function logPrompt(prompt: string): void {
  logSection("generateObject Input String");
  console.log(prompt);
}

async function runGenerateObject(
  prompt: string,
  message: FetchedImapMessage,
  emailBody: string,
  pdfText: string,
): Promise<SimpleSwiggyExtraction> {
  const abort = createAiAbortController();
  try {
    const { object } = await generateObject({
      model: defaultModel(),
      schema: SimpleSwiggyExtractionSchema,
      schemaName: "SimpleSwiggyOrder",
      schemaDescription:
        "A small, flat Swiggy invoice extraction object for evals.",
      mode: "json",
      maxRetries: 0,
      abortSignal: abort.signal,
      temperature: 0,
      seed: 1,
      ...(USE_DETERMINISTIC_REPAIR
        ? {
            experimental_repairText: async ({ text }: { text: string }) =>
              JSON.stringify(
                repairSimpleModelOutput(text, message, emailBody, pdfText),
              ),
          }
        : {}),
      prompt,
    });

    return object;
  } finally {
    abort.clear();
  }
}

function repairSimpleModelOutput(
  text: string,
  message: FetchedImapMessage,
  emailBody: string,
  pdfText: string,
): SimpleSwiggyExtraction {
  const pdfExtraction = extractSimpleFromPdf(message, pdfText);
  const bodyExtraction = extractSimpleFromEmailBody(message, emailBody);
  const parsed = parseJsonObject(text);
  const mapped = parsed ? mapUnknownToSimpleExtraction(parsed, message) : null;
  return mergeSimpleExtraction(message, pdfExtraction, bodyExtraction, mapped);
}

function extractSimpleFromPdf(
  message: FetchedImapMessage,
  pdfText: string,
): SimpleSwiggyExtraction {
  const base = emptySimpleExtraction(message, [
    "No PDF invoice text was available.",
  ]);
  if (!pdfText.trim() || pdfText.trim() === "<none>") {
    return base;
  }

  const invoiceText = firstInvoiceText(pdfText);
  const lines = nonEmptyLines(invoiceText);
  const itemRows = parseInvoiceItemRows(lines);
  const orderId = valueAfterLabel(lines, "Order ID");
  const restaurantName = stripTrailingGstin(
    valueAfterLabel(lines, "Restaurant Name"),
  );
  const customerAddress = valueAfterLabel(lines, "Customer Address");
  const restaurantAddress = valueAfterLabel(lines, "Address");
  const invoiceDate = toIsoDate(valueAfterLabel(lines, "Date of Invoice"));
  const invoiceTotal = tableAmountByLabel(lines, "Invoice Total");
  const itemSubtotal = tableSubtotal(lines);
  const taxTotal = tableAmountByLabel(lines, "Total taxes");
  const packagingFee =
    itemRows
      .filter((item) => /packing/i.test(item.name))
      .reduce((sum, item) => sum + (item.netAmount ?? item.amount ?? 0), 0) ||
    null;
  const discountTotal =
    itemRows.reduce((sum, item) => sum + (item.discount ?? 0), 0) || null;
  const items = itemRows.filter((item) => !/packing/i.test(item.name));
  const parseSuccess = Boolean(orderId && invoiceTotal);

  return SimpleSwiggyExtractionSchema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject: message.subject,
    parseSuccess,
    confidenceScore: parseSuccess ? 0.99 : 0.2,
    orderId,
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
    serviceType: /restaurant service/i.test(invoiceText)
      ? "FOOD_DELIVERY"
      : "UNKNOWN",
    items,
    parseErrors: parseSuccess
      ? []
      : ["PDF text did not include both Order ID and Invoice Total."],
  });
}

function extractSimpleFromEmailBody(
  message: FetchedImapMessage,
  emailBody: string,
): SimpleSwiggyExtraction {
  const orderId = emailBody.match(/\bOrder ID:\s*([A-Z0-9-]+)/i)?.[1] ?? null;
  const paid = emailBody.match(
    /\bPaid Via\s+(.+?)\s+₹\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
  );
  const paidAmount = paid?.[2] ? Number(paid[2]) : null;
  const paymentMethod = paid?.[1]?.trim() || null;
  const platformFee = amountAfterPhrase(emailBody, "Platform fee with GST");
  const deliveryFee = freeFeeAfterPhrase(emailBody, "Delivery Fee");
  const taxTotal = amountAfterPhrase(emailBody, "Taxes");
  const parseSuccess = Boolean(orderId && paidAmount);

  return SimpleSwiggyExtractionSchema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject: message.subject,
    parseSuccess,
    confidenceScore: parseSuccess ? 0.95 : 0,
    orderId,
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
    discountTotal: null,
    paymentMethod,
    serviceType: parseSuccess ? "FOOD_DELIVERY" : "UNKNOWN",
    items: [],
    parseErrors: parseSuccess
      ? []
      : ["Email body did not include both Order ID and paid amount."],
  });
}

function mergeSimpleExtraction(
  message: FetchedImapMessage,
  pdfExtraction: SimpleSwiggyExtraction,
  bodyExtraction: SimpleSwiggyExtraction,
  aiExtraction: SimpleSwiggyExtraction | null,
): SimpleSwiggyExtraction {
  const orderId =
    pdfExtraction.orderId ??
    bodyExtraction.orderId ??
    aiExtraction?.orderId ??
    null;
  const invoiceTotal =
    pdfExtraction.invoiceTotal ?? aiExtraction?.invoiceTotal ?? null;
  const paidAmount =
    bodyExtraction.paidAmount ??
    aiExtraction?.paidAmount ??
    pdfExtraction.paidAmount ??
    invoiceTotal;
  const parseSuccess = Boolean(orderId && paidAmount);
  const parseErrors = parseSuccess
    ? []
    : uniqueStrings([
        ...pdfExtraction.parseErrors,
        ...bodyExtraction.parseErrors,
        ...(aiExtraction?.parseErrors ?? []),
      ]);

  return SimpleSwiggyExtractionSchema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess
      ? "ORDER_CONFIRMATION"
      : (aiExtraction?.emailType ?? pdfExtraction.emailType),
    emailSubject: message.subject,
    parseSuccess,
    confidenceScore: parseSuccess
      ? Math.max(
          pdfExtraction.confidenceScore,
          bodyExtraction.confidenceScore,
          aiExtraction?.confidenceScore ?? 0,
        )
      : Math.max(
          pdfExtraction.confidenceScore,
          bodyExtraction.confidenceScore,
          aiExtraction?.confidenceScore ?? 0,
        ),
    orderId,
    restaurantName:
      pdfExtraction.restaurantName ?? aiExtraction?.restaurantName ?? null,
    customerAddress:
      pdfExtraction.customerAddress ?? aiExtraction?.customerAddress ?? null,
    restaurantAddress:
      pdfExtraction.restaurantAddress ??
      aiExtraction?.restaurantAddress ??
      null,
    invoiceDate: pdfExtraction.invoiceDate ?? aiExtraction?.invoiceDate ?? null,
    invoiceTotal,
    paidAmount,
    itemSubtotal:
      pdfExtraction.itemSubtotal ?? aiExtraction?.itemSubtotal ?? null,
    taxTotal:
      pdfExtraction.taxTotal ??
      bodyExtraction.taxTotal ??
      aiExtraction?.taxTotal ??
      null,
    platformFee:
      bodyExtraction.platformFee ?? aiExtraction?.platformFee ?? null,
    deliveryFee:
      bodyExtraction.deliveryFee ?? aiExtraction?.deliveryFee ?? null,
    packagingFee:
      pdfExtraction.packagingFee ?? aiExtraction?.packagingFee ?? null,
    discountTotal:
      pdfExtraction.discountTotal ?? aiExtraction?.discountTotal ?? null,
    paymentMethod:
      bodyExtraction.paymentMethod ?? aiExtraction?.paymentMethod ?? null,
    serviceType:
      pdfExtraction.serviceType !== "UNKNOWN"
        ? pdfExtraction.serviceType
        : (aiExtraction?.serviceType ?? "UNKNOWN"),
    items:
      pdfExtraction.items.length > 0
        ? pdfExtraction.items
        : (aiExtraction?.items ?? []),
    parseErrors,
  });
}

function buildSwiggyExtraction(
  message: FetchedImapMessage,
  simple: SimpleSwiggyExtraction,
): unknown {
  const transactionAmount = simple.paidAmount ?? simple.invoiceTotal;
  const parseSuccess = Boolean(
    simple.parseSuccess && simple.orderId && transactionAmount,
  );
  const transaction = parseSuccess
    ? {
        amount: transactionAmount,
        currency: "INR",
        type: "DEBIT",
        status: "COMPLETED",
        transactionDate: message.date,
        description: `Swiggy order - ${simple.restaurantName || "Swiggy"}`,
        category: "Food",
        merchantName: simple.restaurantName || "Swiggy",
        merchantCategory: "Restaurant",
        referenceIds: {
          orderId: simple.orderId,
          ...(simple.invoiceDate ? { invoiceDate: simple.invoiceDate } : {}),
          ...(simple.invoiceTotal
            ? { restaurantInvoiceTotal: String(simple.invoiceTotal) }
            : {}),
        },
        location: simple.customerAddress
          ? locationFromAddress(simple.customerAddress)
          : undefined,
        paymentMethod: simple.paymentMethod ?? undefined,
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
    : undefined;

  return {
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject: message.subject,
    parseSuccess,
    parseErrors: parseSuccess
      ? []
      : simple.parseErrors.length > 0
        ? simple.parseErrors
        : ["No completed Swiggy transaction was found."],
    confidenceScore: parseSuccess ? simple.confidenceScore : 0,
    dataSource: parseSuccess
      ? simple.paidAmount && simple.invoiceTotal
        ? "BOTH"
        : simple.invoiceTotal
          ? "PDF_ATTACHMENT"
          : "EMAIL_BODY"
      : "EMAIL_BODY",
    merchantId: SwiggyMerchant.id,
    merchantCode: SwiggyMerchant.code,
    transaction,
    swiggyMetadata: parseSuccess
      ? {
          service:
            simple.serviceType === "UNKNOWN"
              ? "FOOD_DELIVERY"
              : simple.serviceType,
          orderType: "DELIVERY",
        }
      : undefined,
  } satisfies Partial<SwiggyExtraction>;
}

function toSwiggyOrderItem(
  item: SimpleSwiggyExtraction["items"][number],
): Record<string, unknown> {
  return {
    name: item.name,
    quantity: positiveOrUndefined(item.quantity),
    price: positiveOrUndefined(item.unitPrice ?? item.netAmount ?? item.amount),
    customizations: [],
  };
}

function emptySimpleExtraction(
  message: FetchedImapMessage,
  parseErrors: string[],
): SimpleSwiggyExtraction {
  return {
    detectedProvider: "Swiggy",
    emailType: "OTHER",
    emailSubject: message.subject,
    parseSuccess: false,
    confidenceScore: 0,
    orderId: null,
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

function mapUnknownToSimpleExtraction(
  value: unknown,
  message: FetchedImapMessage,
): SimpleSwiggyExtraction {
  const root = isRecord(value) ? value : {};
  const extractedData = recordAt(root, "extractedData");
  const transactionDetails =
    recordAt(root, "transaction_details") ??
    recordAt(root, "transactionDetails") ??
    recordAt(extractedData, "transactionDetails") ??
    recordAt(extractedData, "transaction_details");
  const merchantInfo =
    recordAt(root, "merchant_information") ??
    recordAt(root, "merchantInformation") ??
    recordAt(root, "merchantInfo") ??
    recordAt(extractedData, "merchantInfo") ??
    recordAt(extractedData, "merchant_information");
  const additionalDetails =
    recordAt(root, "additional_details") ??
    recordAt(root, "additionalDetails") ??
    recordAt(extractedData, "additionalDetails");
  const fees =
    recordAt(additionalDetails, "fee_breakdown") ??
    recordAt(additionalDetails, "fees");

  const amount =
    numberAt(root, "invoiceTotal") ??
    numberAt(root, "paidAmount") ??
    numberAt(root, "final_amount_paid") ??
    numberAt(additionalDetails, "final_amount_paid") ??
    numberAt(additionalDetails, "finalAmountPaid") ??
    numberAt(transactionDetails, "amount");
  const paidAmount =
    numberAt(root, "paidAmount") ??
    numberAt(root, "final_amount_paid") ??
    numberAt(additionalDetails, "final_amount_paid") ??
    numberAt(additionalDetails, "finalAmountPaid") ??
    numberAt(transactionDetails, "amount");
  const orderId =
    stringAt(root, ["orderId"]) ??
    stringAt(root, ["order_id"]) ??
    stringAt(extractedData, ["orderId"]) ??
    stringAt(transactionDetails, ["reference_id"]);
  const restaurantName =
    stringAt(root, ["restaurantName"]) ??
    stringAt(additionalDetails, ["restaurant_name"]) ??
    stringAt(merchantInfo, ["merchantName"]) ??
    stringAt(merchantInfo, ["name"]);
  const customerAddress =
    stringAt(root, ["customerAddress"]) ??
    stringAt(additionalDetails, ["delivery_address"]) ??
    stringAt(merchantInfo, ["location", "address"]) ??
    stringAt(merchantInfo, ["location"]);
  const itemSubtotal =
    numberAt(root, "itemSubtotal") ??
    numberAt(fees, "item_total") ??
    numberAt(fees, "itemTotal");
  const taxTotal =
    numberAt(root, "taxTotal") ??
    numberAt(fees, "taxes") ??
    numberAt(additionalDetails, "taxes");
  const packagingFee =
    numberAt(root, "packagingFee") ??
    numberAt(fees, "packaging_fee") ??
    numberAt(fees, "packagingFee");
  const platformFee =
    numberAt(root, "platformFee") ?? numberAt(fees, "platformFee");
  const deliveryFee =
    numberAt(root, "deliveryFee") ??
    numberAt(fees, "delivery_fee") ??
    numberAt(fees, "deliveryFee");
  const discountTotal =
    numberAt(root, "discountTotal") ??
    numberAt(fees, "discounts") ??
    numberAt(additionalDetails, "discounts");
  const parseSuccess = Boolean(
    booleanAt(root, "parseSuccess") && orderId && amount,
  );

  return SimpleSwiggyExtractionSchema.parse({
    detectedProvider: "Swiggy",
    emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
    emailSubject: message.subject,
    parseSuccess,
    confidenceScore:
      numberAt(root, "confidenceScore") ??
      numberAt(root, "confidence_score") ??
      0,
    orderId: orderId ?? null,
    restaurantName: restaurantName ? stripTrailingGstin(restaurantName) : null,
    customerAddress: customerAddress ?? null,
    restaurantAddress: null,
    invoiceDate:
      toIsoDate(stringAt(root, ["invoiceDate"])) ??
      toIsoDate(stringAt(transactionDetails, ["date_time"])) ??
      toIsoDate(stringAt(transactionDetails, ["date"])),
    invoiceTotal: numberAt(root, "invoiceTotal") ?? null,
    paidAmount: paidAmount ?? amount ?? null,
    itemSubtotal: itemSubtotal ?? null,
    taxTotal: taxTotal ?? null,
    platformFee: platformFee ?? null,
    deliveryFee: deliveryFee ?? null,
    packagingFee: packagingFee ?? null,
    discountTotal: discountTotal ?? null,
    paymentMethod:
      stringAt(root, ["paymentMethod"]) ??
      stringAt(transactionDetails, ["payment_method"]) ??
      stringAt(transactionDetails, ["paymentMethod"]) ??
      null,
    serviceType: parseServiceType(
      stringAt(root, ["serviceType"]) ??
        stringAt(root, ["service_type"]) ??
        stringAt(extractedData, ["serviceType"]),
    ),
    items: arrayAt(additionalDetails, "items")
      .map((item) => mapUnknownItem(item))
      .filter((item): item is SimpleSwiggyExtraction["items"][number] =>
        Boolean(item),
      ),
    parseErrors: stringArrayAt(root, "parseErrors"),
  });
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
): SimpleSwiggyExtraction["items"] {
  const rows: SimpleSwiggyExtraction["items"] = [];
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = markdownCells(line);
    const rowNumber = cells[0];
    if (!rowNumber || !/^\d+\.?$/.test(rowNumber)) continue;
    const name = cells[1];
    if (!name || /description/i.test(name)) continue;

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

function moneyFromText(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const amount = Number(match[0]);
  return Number.isFinite(amount) ? amount : null;
}

function amountAfterPhrase(text: string, phrase: string): number | null {
  const escaped = escapeRegExp(phrase);
  const match = text.match(
    new RegExp(`${escaped}[^₹\\d]*₹?\\s*([0-9]+(?:\\.[0-9]{1,2})?)`, "i"),
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  return date.toISOString();
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

function positiveOrUndefined(
  value: number | null | undefined,
): number | undefined {
  return typeof value === "number" && value > 0 ? value : undefined;
}

function parseJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) return null;
    try {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}

function recordAt(value: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const found = value[key];
  return isRecord(found) ? found : null;
}

function numberAt(value: unknown, key: string): number | null {
  if (!isRecord(value)) return null;
  const found = value[key];
  if (typeof found === "number" && Number.isFinite(found)) return found;
  if (typeof found === "string") return moneyFromText(found);
  return null;
}

function booleanAt(value: unknown, key: string): boolean | null {
  if (!isRecord(value)) return null;
  const found = value[key];
  return typeof found === "boolean" ? found : null;
}

function arrayAt(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) return [];
  const found = value[key];
  return Array.isArray(found) ? found : [];
}

function stringArrayAt(value: unknown, key: string): string[] {
  return arrayAt(value, key).filter(
    (item): item is string => typeof item === "string",
  );
}

function mapUnknownItem(
  item: unknown,
): SimpleSwiggyExtraction["items"][number] | null {
  if (!isRecord(item)) return null;
  const name =
    stringAt(item, ["name"]) ??
    stringAt(item, ["description"]) ??
    stringAt(item, ["item"]);
  if (!name) return null;

  return {
    name,
    quantity: numberAt(item, "quantity"),
    unitPrice: numberAt(item, "unitPrice") ?? numberAt(item, "price"),
    amount: numberAt(item, "amount") ?? numberAt(item, "price"),
    discount: numberAt(item, "discount"),
    netAmount: numberAt(item, "netAmount") ?? numberAt(item, "price"),
  };
}

function parseServiceType(
  value: string | null | undefined,
): SimpleSwiggyExtraction["serviceType"] {
  if (!value) return "UNKNOWN";
  if (/instamart/i.test(value)) return "INSTAMART";
  if (/genie/i.test(value)) return "GENIE";
  if (/dine/i.test(value)) return "DINEOUT";
  if (/food|restaurant/i.test(value)) return "FOOD_DELIVERY";
  return "UNKNOWN";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function logAiOutput(output: unknown, elapsedMs: number): void {
  logSection("generateObject Output");
  console.log(`AI extraction time: ${formatMs(elapsedMs)}`);
  console.log(JSON.stringify(output, null, 2));
}

function logAiFailure(error: unknown, elapsedMs: number): void {
  logSection("generateObject Output");
  console.log(`AI extraction time: ${formatMs(elapsedMs)}`);
  console.log("AI extraction failed for this email; continuing to next email.");
  console.log(formatUnknownError(error));

  const rawText = stringProperty(error, "text");
  if (rawText) {
    console.log("\nRAW MODEL OUTPUT:");
    console.log(rawText);
  }
}

function logFinalExtraction(
  output: unknown,
  parsed: ReturnType<typeof SwiggyMerchant.schema.safeParse>,
): void {
  logSection("Normalized SwiggyExtraction Output");
  if (parsed.success) {
    const transaction = parsed.data.transaction;
    console.log("Original schema validation: ok");
    console.log(
      `Transaction: ${parsed.data.parseSuccess ? "parsed" : "not parsed"} | ` +
        `orderId=${transaction?.orderId ?? "<none>"} | ` +
        `amount=${transaction?.amount ?? "<none>"} | ` +
        `restaurant=${transaction?.restaurantName ?? "<none>"}`,
    );
    console.log(JSON.stringify(parsed.data, null, 2));
    return;
  }

  console.log("Original schema validation: failed");
  console.log(
    parsed.error.errors
      .map((error) => `${error.path.join(".")}: ${error.message}`)
      .join("\n"),
  );
  console.log(JSON.stringify(output, null, 2));
}

function logTimings(timings: EmailTiming): void {
  logSection("Timing");
  console.log(`Fetch/read email: ${formatMs(timings.fetchMs)}`);
  console.log(`PDF extract: ${formatMs(timings.pdfExtractMs)}`);
  console.log(`AI extract: ${formatMs(timings.aiMs)}`);
  console.log(`Total for email: ${formatMs(timings.totalMs)}`);
}

function logRunSummary(results: EmailRunResult[]): void {
  const pdfEmails = results.filter((result) => result.hasPdf);
  const nonPdfEmails = results.filter((result) => !result.hasPdf);
  const pdfPassed = pdfEmails.filter(
    (result) => result.finalSchemaOk && result.parseSuccess,
  );
  const pdfFailed = pdfEmails.filter(
    (result) => !result.finalSchemaOk || !result.parseSuccess,
  );
  const nonTransactionOk = nonPdfEmails.filter(
    (result) => result.finalSchemaOk && !result.parseSuccess,
  );
  const aiPassed = results.filter((result) => result.aiExtractionOk);

  logSection("Run Summary");
  console.log(`Emails processed: ${results.length}`);
  console.log(
    `PDF extraction: ${pdfEmails.filter((result) => result.pdfExtractionOk).length}/${pdfEmails.length} PDF email(s) ok`,
  );
  console.log(
    `AI simple schema: ${aiPassed.length}/${results.length} email(s) returned a valid simple object`,
  );
  console.log(
    `PDF-backed transaction eval: ${pdfPassed.length}/${pdfEmails.length} passed, ${pdfFailed.length} failed`,
  );
  console.log(
    `Non-transaction handling: ${nonTransactionOk.length}/${nonPdfEmails.length} returned parseSuccess=false`,
  );

  for (const result of results) {
    const status =
      result.hasPdf && result.finalSchemaOk && result.parseSuccess
        ? "PASS"
        : !result.hasPdf && result.finalSchemaOk && !result.parseSuccess
          ? "NO_TXN"
          : "FAIL";
    console.log(
      [
        `${result.index}. ${status}`,
        `uid=${result.uid}`,
        `subject=${result.subject}`,
        `orderId=${result.orderId ?? "<none>"}`,
        `amount=${result.amount ?? "<none>"}`,
        `restaurant=${result.restaurantName ?? "<none>"}`,
      ].join(" | "),
    );
    if (status === "FAIL" && result.failureReason) {
      console.log(`   reason=${result.failureReason}`);
    }
  }
}

function logSection(title: string): void {
  console.log(`\n${"=".repeat(90)}`);
  console.log(title);
  console.log("=".repeat(90));
}

function elapsedSince(startedAt: number): number {
  return performance.now() - startedAt;
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const lines = [`${error.name}: ${error.message}`];
    const cause = error.cause;
    if (cause instanceof Error) {
      lines.push(`Cause: ${cause.name}: ${cause.message}`);
    }
    return lines.join("\n");
  }

  if (typeof error === "string") {
    return error;
  }

  return JSON.stringify(error, null, 2);
}

function stringProperty(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const property = value[key];
  return typeof property === "string" ? property : undefined;
}

function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms.toFixed(0)}ms`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
