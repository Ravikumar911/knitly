import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { simpleParser } from "mailparser";
import {
  LOCAL_USER_ID,
  deleteTransactionV2,
  getSwiggyExtractionValidationRows,
  storeTransactionV2Input,
  updateEmailData,
  type SwiggyExtractionValidationRow,
} from "@workspace/database";
import { SwiggyMerchant } from "../src/merchants/swiggy";
import { extractTransactionFromEmail } from "../src/extract/pipeline";
import { isSwiggyMarketingEmail } from "../src/extract/swiggy-body-signals";
import type { EmailData } from "../src/types/email-extraction";

process.env.SQLITE_DB_PATH =
  process.env.SQLITE_DB_PATH || join(homedir(), ".slashcash", "db.sqlite");
process.env.SLASHCASH_HOME =
  process.env.SLASHCASH_HOME || join(homedir(), ".slashcash");

type RepairResult = {
  parsedEmailId: string;
  outcome:
    | "repaired"
    | "removed_marketing"
    | "still_fallback"
    | "failed"
    | "skipped";
  schemaUsed?: string;
  confidence?: number;
  detail?: string;
};

function resolveLimit() {
  const configured = Number(process.env.SLASHCASH_REPAIR_LIMIT ?? 500);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : 500;
}

function resolveOnlyFallback() {
  const raw = process.env.SLASHCASH_REPAIR_ONLY_FALLBACK ?? "1";
  return raw === "1" || raw.toLowerCase() === "true";
}

function resolvePacingMs() {
  const configured = Number(process.env.SLASHCASH_EXTRACT_PACING_MS ?? 1500);
  return Number.isFinite(configured) && configured >= 0
    ? Math.floor(configured)
    : 1500;
}

function pdfPaths(row: SwiggyExtractionValidationRow) {
  return (row.attachmentStoragePath ?? []).filter((path) =>
    path.toLowerCase().endsWith(".pdf"),
  );
}

function textFromHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
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
  const attachments = pdfPaths(row)
    .filter((path) => existsSync(path))
    .map((path) => ({
      filename: path.split("/").pop() || "attachment.pdf",
      mimeType: "application/pdf" as const,
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

async function sleep(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function repairRow(
  row: SwiggyExtractionValidationRow,
  userId: string,
): Promise<RepairResult> {
  const subject = row.emailSubject || "";
  const email = await toEmailData(row, userId);

  if (isSwiggyMarketingEmail(subject, email.body)) {
    if (row.transactionId) {
      await deleteTransactionV2(row.transactionId);
    }
    await updateEmailData(row.parsedEmailId, {
      parseSuccess: true,
      parseErrors: null,
    });
    return {
      parsedEmailId: row.parsedEmailId,
      outcome: "removed_marketing",
      detail: subject,
    };
  }

  if (
    resolveOnlyFallback() &&
    row.schemaUsed &&
    row.schemaUsed !== "swiggy.fallback.v1"
  ) {
    return {
      parsedEmailId: row.parsedEmailId,
      outcome: "skipped",
      schemaUsed: row.schemaUsed,
      confidence: row.extractionConfidence ?? undefined,
    };
  }

  try {
    const extracted = await extractTransactionFromEmail(email, {
      parsedEmailId: row.parsedEmailId,
      storeTransaction: false,
    });

    if (
      !extracted.parseSuccess ||
      !extracted.extractionData.transaction?.amount
    ) {
      return {
        parsedEmailId: row.parsedEmailId,
        outcome: "still_fallback",
        schemaUsed: extracted.schemaUsed,
        detail: extracted.parseErrors[0] || "No transaction extracted.",
      };
    }

    const transaction = extracted.extractionData.transaction;
    await storeTransactionV2Input({
      userId,
      parsedEmailId: row.parsedEmailId,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      merchantName: SwiggyMerchant.name,
      amount: transaction.amount,
      currency: transaction.currency || "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: new Date(transaction.transactionDate || email.date),
      description: transaction.description || email.subject,
      category: "Food",
      paymentMethod: transaction.paymentMethod || undefined,
      referenceIds: transaction.orderId ? transaction.referenceIds : {},
      merchantData: {
        ...extracted.extractionData,
        warnings: extracted.warnings,
        provenance: extracted.provenance,
      } as Record<string, unknown>,
      extractionConfidence: extracted.extractionConfidence,
      schemaUsed: extracted.schemaUsed,
      dataSource: extracted.dataSource,
      isVerified: false,
    });

    await updateEmailData(row.parsedEmailId, {
      parseSuccess: true,
      parseErrors:
        extracted.parseErrors.length > 0
          ? JSON.stringify(extracted.parseErrors)
          : null,
    });

    return {
      parsedEmailId: row.parsedEmailId,
      outcome:
        extracted.schemaUsed === "swiggy.llm.v1"
          ? "repaired"
          : "still_fallback",
      schemaUsed: extracted.schemaUsed,
      confidence: extracted.extractionConfidence,
    };
  } catch (error) {
    return {
      parsedEmailId: row.parsedEmailId,
      outcome: "failed",
      detail: error instanceof Error ? error.message : "Repair failed.",
    };
  }
}

async function main() {
  const rows = await getSwiggyExtractionValidationRows(LOCAL_USER_ID, {
    limit: resolveLimit(),
  });
  const onlyFallback = resolveOnlyFallback();
  const candidates = rows.filter((row) => {
    if (!row.transactionId || row.amount === null) return false;
    if (!onlyFallback) return true;
    return row.schemaUsed === "swiggy.fallback.v1";
  });
  const results: RepairResult[] = [];

  for (const [index, row] of candidates.entries()) {
    process.stderr.write(
      `repair ${index + 1}/${candidates.length} ${row.parsedEmailId} ${row.emailSubject || ""}\n`,
    );
    results.push(await repairRow(row, LOCAL_USER_ID));
    await sleep(resolvePacingMs());
  }

  const summary = {
    repaired: results.filter((row) => row.outcome === "repaired").length,
    removed_marketing: results.filter(
      (row) => row.outcome === "removed_marketing",
    ).length,
    still_fallback: results.filter((row) => row.outcome === "still_fallback")
      .length,
    failed: results.filter((row) => row.outcome === "failed").length,
    skipped: results.filter((row) => row.outcome === "skipped").length,
  };

  console.log(JSON.stringify({ summary, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
