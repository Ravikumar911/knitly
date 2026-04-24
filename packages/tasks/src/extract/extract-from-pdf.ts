import { logPipelineStep, syncDebug } from "../utils/sync-debug";
import { extractPdf } from "./pdf-extractor";

export type PdfTextSource = {
  text: string;
  warnings: string[];
  attachmentPath: string;
  extractor: string;
  extractorVersion: string;
  pageCount?: number | null;
  tableCount: number;
};

export async function extractTextFromPdf(input: {
  attachmentPath: string;
}): Promise<
  { ok: true; value: PdfTextSource } | { ok: false; message: string }
> {
  const result = await extractPdf(input.attachmentPath);
  if (!result.ok) {
    syncDebug("pdf-wrapper-error", {
      attachmentPath: input.attachmentPath,
      code: result.error.code,
      message: result.error.message,
    });
    const stderr = result.error.stderr
      ? result.error.stderr.length > 400
        ? `${result.error.stderr.slice(0, 400)}…`
        : result.error.stderr
      : undefined;
    logPipelineStep("pdf-extractor", {
      step: 2,
      outcome: "error",
      code: result.error.code,
      message: result.error.message,
      exitCode: result.error.exitCode ?? null,
      stderr: stderr,
      path: input.attachmentPath,
    });
    return {
      ok: false,
      message: result.error.message,
    };
  }

  const pdf = result.value;
  logPipelineStep("pdf-extractor", {
    step: 2,
    outcome: "ok",
    path: input.attachmentPath,
    extractor: pdf.extractor,
    extractorVersion: pdf.extractorVersion,
    rawTextChars: pdf.raw.text.length,
    tableCount: pdf.raw.tables.length,
    warningCount: pdf.warnings.length,
  });
  syncDebug("pdf-wrapper-text", {
    attachmentPath: input.attachmentPath,
    extractor: pdf.extractor,
    extractorVersion: pdf.extractorVersion,
    warningCount: pdf.warnings.length,
    rawTextChars: pdf.raw.text.length,
    tableCount: pdf.raw.tables.length,
  });

  const text = pdf.raw.text.trim();
  if (!text) {
    return {
      ok: false,
      message: "The PDF extractor returned no text.",
    };
  }

  return {
    ok: true,
    value: {
      text,
      warnings: pdf.warnings,
      attachmentPath: input.attachmentPath,
      extractor: pdf.extractor,
      extractorVersion: pdf.extractorVersion,
      pageCount: pdf.raw.pageCount,
      tableCount: pdf.raw.tables.length,
    },
  };
}

export const extractFromPdf = extractTextFromPdf;
