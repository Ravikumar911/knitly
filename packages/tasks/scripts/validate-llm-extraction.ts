import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { simpleParser } from "mailparser";
import type { SwiggyExtractionValidationRow } from "@workspace/database";
import type { EmailData } from "../src/types/email-extraction";

process.env.SQLITE_DB_PATH =
  process.env.SQLITE_DB_PATH || join(homedir(), ".slashcash", "db.sqlite");
process.env.SLASHCASH_HOME =
  process.env.SLASHCASH_HOME || join(homedir(), ".slashcash");

type FieldStats = {
  baselinePresent: number;
  extractedPresent: number;
  matched: number;
  missing: number;
  mismatched: number;
};

type Mismatch = {
  emailId: string;
  subject: string;
  path: string;
  expected: unknown;
  actual: unknown;
};

type ExtractionCase = {
  emailId: string;
  subject: string;
  amount?: number | null;
  schemaUsed?: string;
  reason?: string;
};

async function main() {
  const database = await import("@workspace/database");
  const { extractTransactionFromEmail } = await import(
    "../src/extract/pipeline"
  );
  const { extractTextFromPdf } = await import(
    "../src/extract/extract-from-pdf"
  );

  const days = resolveLookbackDays();
  const since =
    days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1_000) : undefined;
  const rows = await database.getSwiggyExtractionValidationRows(
    database.LOCAL_USER_ID,
    {
      startDate: since,
      limit: resolveLimit(),
    },
  );

  const stats = {
    totalEmails: rows.length,
    baselineTransactions: rows.filter(hasBaselineTransaction).length,
    extractedTransactions: 0,
    falseNegatives: 0,
    falsePositives: 0,
    fallback: 0,
    lowConfidence: 0,
    pdfAttachments: 0,
    pdfFilesPresent: 0,
    pdfTextReadable: 0,
    pdfTextChars: 0,
    pdfReadFailures: 0,
  };
  const fieldStats = new Map<string, FieldStats>();
  const mismatches: Mismatch[] = [];
  const falseNegatives: ExtractionCase[] = [];
  const falsePositives: ExtractionCase[] = [];
  const pdfFailures: ExtractionCase[] = [];
  const extras = new Map<string, number>();

  await runWithConcurrency(rows, resolveConcurrency(), async (row, index) => {
    const subject = row.emailSubject || "Swiggy transaction";
    console.error(
      `validating ${index + 1}/${rows.length} ${row.parsedEmailId} ${subject}`,
    );
    const email = await toEmailData(row, database.LOCAL_USER_ID);
    const pdfs = pdfPaths(row);
    stats.pdfAttachments += pdfs.length;

    for (const path of pdfs) {
      if (existsSync(path)) {
        stats.pdfFilesPresent += 1;
      }
      const pdf = await extractTextFromPdf({
        attachmentPath: path,
        emailBody: email.body,
        subject,
      });
      if (pdf.ok && pdf.value.text.trim()) {
        stats.pdfTextReadable += 1;
        stats.pdfTextChars += pdf.value.text.length;
      } else {
        stats.pdfReadFailures += 1;
        pushCase(pdfFailures, {
          emailId: row.parsedEmailId,
          subject,
          reason: pdf.ok ? "empty text" : pdf.message,
        });
      }
    }

    const result = await extractTransactionFromEmail(email, {
      storeTransaction: false,
    });
    const baselineHasTransaction = hasBaselineTransaction(row);
    const extractedHasTransaction = Boolean(
      result.parseSuccess && result.extractionData.transaction,
    );

    if (extractedHasTransaction) stats.extractedTransactions += 1;
    if (baselineHasTransaction && !extractedHasTransaction) {
      stats.falseNegatives += 1;
      pushCase(falseNegatives, {
        emailId: row.parsedEmailId,
        subject,
        amount: row.amount,
        schemaUsed: result.schemaUsed,
        reason: result.parseErrors.join("; ") || "no extracted transaction",
      });
    }
    if (!baselineHasTransaction && extractedHasTransaction) {
      stats.falsePositives += 1;
      pushCase(falsePositives, {
        emailId: row.parsedEmailId,
        subject,
        amount: result.extractionData.transaction?.amount,
        schemaUsed: result.schemaUsed,
      });
    }
    if (result.schemaUsed === "swiggy.fallback.v1") stats.fallback += 1;
    if (result.extractionConfidence < 0.6) stats.lowConfidence += 1;

    if (baselineHasTransaction && extractedHasTransaction) {
      compareFlattened({
        emailId: row.parsedEmailId,
        subject,
        baseline: flattenComparable(baselineComparable(row)),
        actual: flattenComparable(actualComparable(result.extractionData)),
        fieldStats,
        mismatches,
        extras,
      });
    }

    console.error(`validated ${index + 1}/${rows.length}`);
  });

  console.log(
    since
      ? `Swiggy LLM extraction parity, last ${days} days since ${isoDate(since)}`
      : "Swiggy LLM extraction parity, all Swiggy emails in DB",
  );
  console.table({
    emails: stats.totalEmails,
    "baseline transactions": stats.baselineTransactions,
    "extracted transactions": stats.extractedTransactions,
    "false negatives": stats.falseNegatives,
    "false positives": stats.falsePositives,
    "parseSuccess %": pct(
      stats.extractedTransactions,
      stats.baselineTransactions,
    ),
    "fallback rate %": pct(stats.fallback, stats.totalEmails),
    "confidence < 0.6": stats.lowConfidence,
    "pdf attachments": stats.pdfAttachments,
    "pdf files present": stats.pdfFilesPresent,
    "pdf readable text": stats.pdfTextReadable,
    "pdf read failures": stats.pdfReadFailures,
    "pdf text chars": stats.pdfTextChars,
  });

  console.log("\nCritical field parity");
  console.table(fieldSummary(fieldStats, criticalFields()));

  console.log("\nAll baseline field parity");
  console.table(fieldSummary(fieldStats, [...fieldStats.keys()].sort()));

  const topExtras = [...extras.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 25)
    .map(([path, count]) => ({ path, count }));
  if (topExtras.length > 0) {
    console.log("\nExtra extracted fields not present in baseline");
    console.table(topExtras);
  }

  if (falseNegatives.length > 0) {
    console.log("\nFalse negatives");
    console.table(falseNegatives);
  }

  if (falsePositives.length > 0) {
    console.log("\nFalse positives");
    console.table(falsePositives);
  }

  if (pdfFailures.length > 0) {
    console.log("\nPDF read failures");
    console.table(pdfFailures);
  }

  if (mismatches.length > 0) {
    console.log("\nSample mismatches");
    console.table(mismatches.slice(0, 50));
  }
}

async function toEmailData(
  row: SwiggyExtractionValidationRow,
  userId: string,
): Promise<EmailData> {
  const parsed = row.rawContent
    ? await simpleParser(Buffer.from(row.rawContent))
    : null;
  const text = parsed?.text?.trim();
  const html = typeof parsed?.html === "string" ? parsed.html : "";
  const body =
    text || textFromHtml(html) || row.emailSnippet || row.emailSubject || "";
  const attachments = pdfPaths(row).map((path) => ({
    filename: path.split("/").pop() || "attachment.pdf",
    mimeType: "application/pdf",
    content: "",
    storageUrl: path,
  }));

  return {
    userId,
    emailId: row.parsedEmailId,
    threadId: row.parsedEmailId,
    subject: row.emailSubject || "Swiggy transaction",
    body,
    date: (row.emailReceivedDate || new Date()).toISOString(),
    from: row.emailSender || "orders@swiggy.in",
    attachments,
  };
}

function baselineComparable(row: SwiggyExtractionValidationRow) {
  const merchantData = row.merchantData;
  const transaction = {
    ...asRecord(merchantData.transaction),
    amount: row.amount,
    paymentMethod:
      row.paymentMethod || asRecord(merchantData.transaction)?.paymentMethod,
    referenceIds: {
      ...asRecord(row.referenceIds),
      ...asRecord(asRecord(merchantData.transaction)?.referenceIds),
    },
  };

  return {
    detectedProvider: merchantData.detectedProvider,
    emailType: merchantData.emailType,
    merchantId: merchantData.merchantId,
    merchantCode: merchantData.merchantCode,
    transaction,
    swiggyMetadata: asRecord(merchantData.swiggyMetadata) ?? {},
  };
}

function actualComparable(extractionData: Record<string, unknown>) {
  const transaction = asRecord(extractionData.transaction) ?? {};
  return {
    detectedProvider: extractionData.detectedProvider,
    emailType: extractionData.emailType,
    merchantId: extractionData.merchantId,
    merchantCode: extractionData.merchantCode,
    transaction,
    swiggyMetadata: asRecord(extractionData.swiggyMetadata) ?? {},
  };
}

function compareFlattened(input: {
  emailId: string;
  subject: string;
  baseline: Record<string, unknown>;
  actual: Record<string, unknown>;
  fieldStats: Map<string, FieldStats>;
  mismatches: Mismatch[];
  extras: Map<string, number>;
}) {
  for (const [path, expected] of Object.entries(input.baseline)) {
    const actual = input.actual[path];
    const current = ensureFieldStats(input.fieldStats, path);
    current.baselinePresent += 1;
    if (!isPresent(actual)) {
      current.missing += 1;
      pushMismatch(
        input.mismatches,
        input.emailId,
        input.subject,
        path,
        expected,
        actual,
      );
      continue;
    }
    current.extractedPresent += 1;
    if (valuesMatch(expected, actual)) {
      current.matched += 1;
    } else {
      current.mismatched += 1;
      pushMismatch(
        input.mismatches,
        input.emailId,
        input.subject,
        path,
        expected,
        actual,
      );
    }
  }

  for (const path of Object.keys(input.actual)) {
    if (!(path in input.baseline)) {
      input.extras.set(path, (input.extras.get(path) ?? 0) + 1);
    }
  }
}

function flattenComparable(
  value: unknown,
  prefix = "",
): Record<string, unknown> {
  if (!isPresent(value)) return {};
  if (Array.isArray(value)) {
    const result: Record<string, unknown> = {};
    if (prefix) result[`${prefix}.length`] = value.length;
    value.forEach((item, index) => {
      Object.assign(result, flattenComparable(item, `${prefix}[${index}]`));
    });
    return result;
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!isPresent(nested)) continue;
      if (Array.isArray(nested) || typeof nested === "object") {
        Object.assign(result, flattenComparable(nested, path));
      } else {
        result[path] = normalizeValue(nested);
      }
    }
    return result;
  }
  return prefix ? { [prefix]: normalizeValue(value) } : {};
}

function fieldSummary(fieldStats: Map<string, FieldStats>, paths: string[]) {
  return paths.flatMap((path) => {
    const stats = fieldStats.get(path);
    if (!stats) return [];
    return [
      {
        path,
        baseline: stats.baselinePresent,
        captured: stats.extractedPresent,
        matched: stats.matched,
        missing: stats.missing,
        mismatched: stats.mismatched,
        "capture %": pct(stats.extractedPresent, stats.baselinePresent),
        "match %": pct(stats.matched, stats.baselinePresent),
      },
    ];
  });
}

function criticalFields() {
  return [
    "transaction.orderId",
    "transaction.amount",
    "transaction.restaurantName",
    "transaction.merchantName",
    "transaction.paymentMethod",
    "transaction.referenceIds.orderId",
    "transaction.referenceIds.invoiceNo",
    "transaction.referenceIds.invoiceDate",
    "transaction.deliveryAddress.fullAddress",
    "transaction.deliveryAddress.pincode",
    "transaction.deliveryFee",
    "transaction.taxes",
    "transaction.discount",
    "transaction.packagingFee",
    "transaction.orderItems.length",
    "swiggyMetadata.service",
    "swiggyMetadata.orderType",
  ];
}

function pdfPaths(row: SwiggyExtractionValidationRow) {
  return (row.attachmentStoragePath ?? []).filter((path) =>
    path.toLowerCase().endsWith(".pdf"),
  );
}

function hasBaselineTransaction(row: SwiggyExtractionValidationRow) {
  return Boolean(row.transactionId && row.amount && row.amount > 0);
}

function valuesMatch(expected: unknown, actual: unknown) {
  if (typeof expected === "number" || typeof actual === "number") {
    return Math.abs(Number(expected) - Number(actual)) <= 0.01;
  }
  if (typeof expected === "boolean" || typeof actual === "boolean") {
    return Boolean(expected) === Boolean(actual);
  }
  return (
    String(expected).trim().toLowerCase() ===
    String(actual).trim().toLowerCase()
  );
}

function normalizeValue(value: unknown) {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }
  return value;
}

function isPresent(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function ensureFieldStats(fieldStats: Map<string, FieldStats>, path: string) {
  const existing = fieldStats.get(path);
  if (existing) return existing;
  const created = {
    baselinePresent: 0,
    extractedPresent: 0,
    matched: 0,
    missing: 0,
    mismatched: 0,
  };
  fieldStats.set(path, created);
  return created;
}

function pushMismatch(
  mismatches: Mismatch[],
  emailId: string,
  subject: string,
  path: string,
  expected: unknown,
  actual: unknown,
) {
  if (mismatches.length >= 200) return;
  mismatches.push({
    emailId,
    subject,
    path,
    expected: truncate(expected),
    actual: truncate(actual),
  });
}

function pushCase(cases: ExtractionCase[], value: ExtractionCase) {
  if (cases.length >= 50) return;
  cases.push(value);
}

function truncate(value: unknown) {
  if (typeof value !== "string") return value;
  return value.length > 160 ? `${value.slice(0, 160)}...` : value;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  work: (item: T, index: number) => Promise<void>,
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        await work(items[index]!, index);
      }
    }),
  );
}

function resolveConcurrency() {
  const configured = Number(process.env.SLASHCASH_VALIDATE_CONCURRENCY || 1);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : 1;
}

function resolveLookbackDays() {
  const configured = Number(process.env.SLASHCASH_VALIDATE_DAYS || 90);
  return Number.isFinite(configured) && configured >= 0
    ? Math.floor(configured)
    : 90;
}

function resolveLimit() {
  const configured = Number(process.env.SLASHCASH_VALIDATE_LIMIT || 500);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : 500;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pct(value: number, total: number) {
  return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "n/a";
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function textFromHtml(html: string) {
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
