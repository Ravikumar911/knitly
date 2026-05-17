import { logPipelineStep, syncDebug } from "../utils/sync-debug";
import { extractPdf } from "./pdf-extractor";
import type { PdfExtraction, SourceQuality } from "./pdf-extractor-schema";

export type PdfExtractionSource = {
  extraction: PdfExtraction;
  text: string;
  warnings: string[];
  attachmentPath: string | null;
  extractor: string;
  extractorVersion: string;
  pageCount?: number | null;
  tableCount: number;
  sourceQuality: SourceQuality;
};

export async function extractTextFromPdf(input: {
  attachmentPath?: string | null;
  emailBody?: string;
  subject?: string;
}): Promise<
  { ok: true; value: PdfExtractionSource } | { ok: false; message: string }
> {
  const result = await extractPdf(input.attachmentPath ?? null, {
    emailBody: input.emailBody,
    subject: input.subject,
  });
  if (!result.ok) {
    syncDebug("pdf-wrapper-error", {
      attachmentPath: input.attachmentPath ?? null,
      code: result.error.code,
      message: result.error.message,
    });
    const stderr = result.error.stderr
      ? result.error.stderr.length > 400
        ? `${result.error.stderr.slice(0, 400)}...`
        : result.error.stderr
      : undefined;
    logPipelineStep("pdf-extractor", {
      step: 2,
      outcome: "error",
      code: result.error.code,
      message: result.error.message,
      exitCode: result.error.exitCode ?? null,
      stderr: stderr,
      path: input.attachmentPath ?? null,
    });
    return {
      ok: false,
      message: result.error.message,
    };
  }

  const pdf = result.value;
  const warnings = pdf.source_quality.warnings;
  logPipelineStep("pdf-extractor", {
    step: 2,
    outcome: "ok",
    path: input.attachmentPath ?? null,
    extractor: pdf.extractor,
    extractorVersion: pdf.extractor_version,
    rawTextChars: pdf.raw.text.length,
    tableCount: pdf.raw.tables.length,
    sourceQuality: pdf.source_quality.kind,
    warningCount: warnings.length,
  });
  syncDebug("pdf-wrapper-text", {
    attachmentPath: input.attachmentPath ?? null,
    extractor: pdf.extractor,
    extractorVersion: pdf.extractor_version,
    warningCount: warnings.length,
    rawTextChars: pdf.raw.text.length,
    tableCount: pdf.raw.tables.length,
    sourceQuality: pdf.source_quality.kind,
  });

  return {
    ok: true,
    value: {
      extraction: pdf,
      text: pdf.raw.text.trim(),
      warnings,
      attachmentPath: input.attachmentPath ?? null,
      extractor: pdf.extractor,
      extractorVersion: pdf.extractor_version,
      pageCount: pdf.raw.page_count,
      tableCount: pdf.raw.tables.length,
      sourceQuality: pdf.source_quality,
    },
  };
}

export const extractFromPdf = extractTextFromPdf;
