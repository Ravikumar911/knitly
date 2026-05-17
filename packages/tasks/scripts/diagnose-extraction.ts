import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { simpleParser } from "mailparser";
import type { SwiggyExtractionValidationRow } from "@workspace/database";
import { extractTextFromPdf } from "../src/extract/extract-from-pdf";
import type { PdfExtractionSource } from "../src/extract/extract-from-pdf";
import { extractSwiggyWithLlmDiagnostic } from "../src/extract/swiggy-llm";
import type { EmailData } from "../src/types/email-extraction";
process.env.SQLITE_DB_PATH =
  process.env.SQLITE_DB_PATH || join(homedir(), ".slashcash", "db.sqlite");
process.env.SLASHCASH_HOME =
  process.env.SLASHCASH_HOME || join(homedir(), ".slashcash");

type CheckResult = {
  name: string;
  pass: boolean;
  detail?: string;
};

type SummaryLine = {
  emailId: string;
  subject: string;
  transactionId: string | null;
  llmOk: boolean;
  flags: string;
};

function resolveDiagnosticsDir() {
  const home = process.env.SLASHCASH_HOME || join(homedir(), ".slashcash");
  const root =
    process.env.SLASHCASH_DIAGNOSTICS_DIR || join(home, "diagnostics");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return join(root, ts);
}

function resolveLookbackDays() {
  const configured = Number(process.env.SLASHCASH_DIAGNOSE_DAYS ?? 30);
  return Number.isFinite(configured) && configured >= 0
    ? Math.floor(configured)
    : 30;
}

function resolveLimit() {
  const configured = Number(process.env.SLASHCASH_DIAGNOSE_LIMIT ?? 10);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : 10;
}

function resolveRequireTransaction() {
  const raw = process.env.SLASHCASH_DIAGNOSE_REQUIRE_TRANSACTION ?? "0";
  return raw === "1" || raw.toLowerCase() === "true";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function amountLikelyInText(amount: number | null | undefined, text: string) {
  if (amount == null || !Number.isFinite(amount) || !text) return false;
  const compact = text.replace(/\s+/g, " ");
  const variants = new Set<string>();
  variants.add(String(amount));
  variants.add(amount.toFixed(2));
  variants.add(amount.toFixed(0));
  for (const v of variants) {
    if (compact.includes(v)) return true;
  }
  const fixed2 = amount.toFixed(2);
  const rupee = new RegExp(
    `(₹|Rs\\.?|INR)\\s*${escapeRegex(fixed2)}|${escapeRegex(fixed2)}\\s*(₹|INR)`,
    "i",
  );
  if (rupee.test(compact)) return true;
  return false;
}

function runAutoChecks(input: {
  body: string;
  combinedPdfText: string;
  rawObject: {
    amount: number | null | undefined;
    orderItems: Array<{ name: string | null | undefined }>;
    paymentMethod: string | null | undefined;
    service: string;
    parseSuccess: boolean;
    parseErrors: string[];
  } | null;
  emailDate: Date;
  liveTransactionDate: string | null | undefined;
  storedParseSuccess: unknown;
  storedParseErrors: unknown;
}): CheckResult[] {
  const body = input.body;
  const pdf = input.combinedPdfText;
  const raw = input.rawObject;
  const checks: CheckResult[] = [];

  if (!raw) {
    checks.push({
      name: "llm_raw_object",
      pass: false,
      detail: "No raw LLM object (model error or missing call).",
    });
    return checks;
  }

  const amount = raw.amount;
  const amountInPdf = amountLikelyInText(amount, pdf);
  const amountInBody = amountLikelyInText(amount, body);
  checks.push({
    name: "amount_in_source_text",
    pass: amountInPdf || amountInBody,
    detail:
      amount == null
        ? "amount null"
        : amountInPdf || amountInBody
          ? undefined
          : "amount not found as literal in PDF text or email body",
  });

  for (const item of raw.orderItems || []) {
    const name = item.name?.trim();
    if (!name) continue;
    const inPdf = pdf.toLowerCase().includes(name.toLowerCase());
    checks.push({
      name: `orderItem_in_pdf:${name.slice(0, 40)}`,
      pass: inPdf,
      detail: inPdf
        ? undefined
        : "item name not found in PDF text (LLM may infer or PDF garbled)",
    });
  }

  const pm = raw.paymentMethod?.trim();
  if (pm) {
    const inBody = body.toLowerCase().includes(pm.toLowerCase());
    checks.push({
      name: "paymentMethod_in_body",
      pass: inBody,
      detail: inBody
        ? undefined
        : "payment method string not found verbatim in body",
    });
  }

  if (raw.service === "DINEOUT") {
    const lower = body.toLowerCase();
    const hasKeyword =
      /\b(dineout|dining out|table booking|restaurant booking)\b/i.test(body) ||
      lower.includes("dineout");
    checks.push({
      name: "dineout_keywords",
      pass: hasKeyword,
      detail: hasKeyword
        ? undefined
        : "DINEOUT but no dineout keywords in body",
    });
  }

  const pe = Array.isArray(raw.parseErrors) ? raw.parseErrors : [];
  checks.push({
    name: "parseSuccess_no_parseErrors",
    pass: !(raw.parseSuccess && pe.length > 0),
    detail:
      raw.parseSuccess && pe.length > 0
        ? `parseSuccess true with parseErrors: ${pe.join("; ")}`
        : undefined,
  });

  const spe = input.storedParseSuccess;
  const sperr = input.storedParseErrors;
  const storedErrs = Array.isArray(sperr) ? sperr : [];
  if (typeof spe === "boolean" && spe && storedErrs.length > 0) {
    checks.push({
      name: "stored_parseSuccess_with_errors",
      pass: false,
      detail: `stored parseSuccess true with parseErrors: ${storedErrs.join("; ")}`,
    });
  }

  if (input.liveTransactionDate) {
    const t = new Date(input.liveTransactionDate);
    const ok =
      Number.isFinite(t.getTime()) &&
      Math.abs(t.getTime() - input.emailDate.getTime()) <=
        7 * 24 * 60 * 60 * 1000;
    checks.push({
      name: "transactionDate_near_emailDate",
      pass: ok,
      detail: ok
        ? undefined
        : `live tx date ${input.liveTransactionDate} vs email ${input.emailDate.toISOString()}`,
    });
  }

  return checks;
}

function pdfPaths(row: SwiggyExtractionValidationRow) {
  return (row.attachmentStoragePath ?? []).filter((path) =>
    path.toLowerCase().endsWith(".pdf"),
  );
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

function fence(lang: string, body: string) {
  return "```" + lang + "\n" + body + "\n```\n";
}

function previewTable(table: Record<string, unknown>, maxKeys = 12) {
  const keys = Object.keys(table).slice(0, maxKeys);
  const lines = keys.map((k) => `${k}: ${String(table[k]).slice(0, 200)}`);
  return lines.join("\n");
}

async function main() {
  const database = await import("@workspace/database");
  const userId = database.LOCAL_USER_ID;

  const days = resolveLookbackDays();
  const since =
    days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1_000) : undefined;
  let rows = await database.getSwiggyExtractionValidationRows(userId, {
    startDate: since,
    limit: resolveLimit(),
  });

  if (resolveRequireTransaction()) {
    rows = rows.filter((row) => Boolean(row.transactionId && row.amount));
  }

  const outDir = resolveDiagnosticsDir();
  mkdirSync(outDir, { recursive: true });

  const summary: SummaryLine[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    const subject = row.emailSubject || "Swiggy transaction";
    process.stderr.write(
      `diagnose ${index + 1}/${rows.length} ${row.parsedEmailId} ${subject}\n`,
    );

    const email = await toEmailData(row, userId);
    const pdfSections: string[] = [];
    const pdfResults: Awaited<ReturnType<typeof extractTextFromPdf>>[] = [];

    for (const path of pdfPaths(row)) {
      const fileExists = existsSync(path);
      const pdf = await extractTextFromPdf({
        attachmentPath: path,
        emailBody: email.body,
        subject: email.subject,
      });
      if (pdf.ok) {
        pdfResults.push(pdf);
        pdfSections.push(
          `### ${path}\n\n` +
            `- extractor: ${pdf.value.extractor} ${pdf.value.extractorVersion}\n` +
            `- source_quality: ${pdf.value.sourceQuality.kind}\n` +
            `- parsers_used: ${pdf.value.sourceQuality.parsers_used.join(", ")}\n` +
            `- warnings: ${pdf.value.warnings.join("; ") || "(none)"}\n` +
            `- page_count: ${pdf.value.pageCount ?? pdf.value.extraction.raw.page_count ?? "?"}\n` +
            `- tables: ${pdf.value.tableCount}\n` +
            "\n#### Full PDF extraction JSON\n\n" +
            fence("json", JSON.stringify(pdf.value.extraction, null, 2)) +
            "\n#### raw.text\n\n" +
            fence("text", pdf.value.text || "(empty)") +
            (pdf.value.extraction.raw.tables.length > 0
              ? "\n#### First table preview\n\n" +
                fence(
                  "text",
                  previewTable(
                    pdf.value.extraction.raw.tables[0] as Record<
                      string,
                      unknown
                    >,
                  ),
                )
              : ""),
        );
      } else {
        pdfSections.push(
          `### ${path}\n\n**FAILED:** ${pdf.message}\n\nexists: ${fileExists}\n`,
        );
      }
    }

    const okSources = pdfResults
      .filter((r): r is { ok: true; value: PdfExtractionSource } => r.ok)
      .map((r) => r.value);

    const llm = await extractSwiggyWithLlmDiagnostic(email, okSources);

    const combinedPdfText = okSources.map((s) => s.text).join("\n\n");
    const merchantData = row.merchantData ?? {};
    const storedParseSuccess = merchantData.parseSuccess;
    const storedParseErrors = merchantData.parseErrors;

    const rawObject =
      llm.ok && llm.rawObject
        ? {
            amount: llm.rawObject.amount,
            orderItems: llm.rawObject.orderItems,
            paymentMethod: llm.rawObject.paymentMethod,
            service: llm.rawObject.service,
            parseSuccess: llm.rawObject.parseSuccess,
            parseErrors: llm.rawObject.parseErrors ?? [],
          }
        : null;

    const checks = runAutoChecks({
      body: email.body,
      combinedPdfText,
      rawObject,
      emailDate: row.emailReceivedDate || new Date(),
      liveTransactionDate:
        llm.ok && llm.result.extractionData.transaction?.transactionDate,
      storedParseSuccess,
      storedParseErrors,
    });

    const failedChecks = checks.filter((c) => !c.pass);
    const flags = !llm.ok
      ? `llm_call_failed: ${llm.reason.slice(0, 160)}`
      : failedChecks.length === 0
        ? "ok"
        : failedChecks.map((c) => c.name).join(", ");

    summary.push({
      emailId: row.parsedEmailId,
      subject: subject.slice(0, 80),
      transactionId: row.transactionId,
      llmOk: llm.ok,
      flags,
    });

    const md =
      `# Extraction diagnostic\n\n` +
      `- **parsedEmailId:** ${row.parsedEmailId}\n` +
      `- **transactionId:** ${row.transactionId ?? "(none)"}\n` +
      `- **subject:** ${subject}\n` +
      `- **sender:** ${row.emailSender ?? ""}\n` +
      `- **received:** ${(row.emailReceivedDate || new Date()).toISOString()}\n` +
      `- **schemaUsed (DB):** ${row.schemaUsed ?? ""}\n` +
      `- **extractionConfidence (DB):** ${row.extractionConfidence ?? ""}\n` +
      `- **dataSource (DB):** ${row.dataSource ?? ""}\n` +
      `- **LLM diagnostic ok:** ${llm.ok}\n` +
      (llm.ok === false ? `- **LLM error:** ${llm.reason}\n` : "") +
      `\n## Auto-checks\n\n` +
      checks
        .map(
          (c) =>
            `- ${c.pass ? "[pass]" : "[fail]"} **${c.name}**${c.detail ? `: ${c.detail}` : ""}`,
        )
        .join("\n") +
      `\n\n## Email body\n\n` +
      fence("text", email.body || "(empty)") +
      `\n\n## Python PDF extractor (${pdfPaths(row).length} paths)\n\n` +
      pdfSections.join("\n") +
      `\n\n## Haiku / LLM\n\n` +
      (llm.ok
        ? "### usage\n\n" +
          fence("json", JSON.stringify(llm.usage ?? null, null, 2)) +
          "\n### raw object (generateObject)\n\n" +
          fence("json", JSON.stringify(llm.rawObject, null, 2)) +
          "\n### normalized result (post-Zod / SwiggyMerchant)\n\n" +
          fence("json", JSON.stringify(llm.result.extractionData, null, 2))
        : fence("json", JSON.stringify(llm.result, null, 2))) +
      `\n\n## Current DB transaction row (joined)\n\n` +
      `- **amount:** ${row.amount ?? ""}\n` +
      `- **paymentMethod:** ${row.paymentMethod ?? ""}\n` +
      `- **transactionDate:** ${row.transactionDate ? row.transactionDate.toISOString() : ""}\n` +
      `- **description:** ${row.description ?? ""}\n` +
      `- **referenceIds:** ${fence("json", JSON.stringify(row.referenceIds ?? {}, null, 2))}` +
      `\n\n### merchantData (JSON)\n\n` +
      fence("json", JSON.stringify(merchantData, null, 2)) +
      `\n`;

    writeFileSync(join(outDir, `${row.parsedEmailId}.md`), md, "utf8");
  }

  const summaryMd =
    `# Diagnostic summary\n\n` +
    `- **output directory:** \`${outDir}\`\n` +
    `- **lookback days:** ${days}\n` +
    `- **rows written:** ${rows.length}\n\n` +
    `| emailId | transactionId | llmOk | flags | subject |\n` +
    `| --- | --- | --- | --- | --- |\n` +
    summary
      .map(
        (s) =>
          `| ${s.emailId} | ${s.transactionId ?? ""} | ${s.llmOk} | ${s.flags.replace(/\|/g, "\\|")} | ${s.subject.replace(/\|/g, "\\|")} |`,
      )
      .join("\n") +
    `\n`;

  writeFileSync(join(outDir, "summary.md"), summaryMd, "utf8");
  process.stdout.write(`\nWrote ${rows.length} reports under:\n${outDir}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
