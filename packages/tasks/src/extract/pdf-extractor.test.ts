import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractPdf } from "./pdf-extractor";

describe("extractPdf", () => {
  const previousPython = process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON;
  const previousPyPath = process.env.PYTHONPATH;
  const previousTimeout = process.env.SLASHCASH_PDF_EXTRACTOR_TIMEOUT_MS;
  let root = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "slashcash-pdf-stub-"));
    process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON = "python3";
    process.env.PYTHONPATH = root;
    delete process.env.SLASHCASH_PDF_EXTRACTOR_DISABLED;
  });

  afterEach(() => {
    if (previousPython === undefined) {
      delete process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON;
    } else {
      process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON = previousPython;
    }

    if (previousPyPath === undefined) {
      delete process.env.PYTHONPATH;
    } else {
      process.env.PYTHONPATH = previousPyPath;
    }

    if (previousTimeout === undefined) {
      delete process.env.SLASHCASH_PDF_EXTRACTOR_TIMEOUT_MS;
    } else {
      process.env.SLASHCASH_PDF_EXTRACTOR_TIMEOUT_MS = previousTimeout;
    }

    rmSync(root, { recursive: true, force: true });
  });

  it("parses a valid JSON payload from the python module", async () => {
    writeStubModule(
      root,
      [
        "import json, sys",
        "print(json.dumps({",
        "'schemaVersion': '1',",
        "'extractor': 'stub',",
        "'extractorVersion': '1.0.0',",
        "'merchant': 'swiggy',",
        "'confidence': 0.92,",
        "'fields': {'orderId': 'SWG-PDF-1001', 'totalAmount': 512.4, 'currency': 'INR', 'items': []},",
        "'warnings': [],",
        "'raw': {'pageCount': 1, 'tables': [], 'text': 'fixture'}",
        "}))",
      ].join("\n"),
    );

    const pdfPath = join(root, "fixture.pdf");
    writeFileSync(pdfPath, "%PDF-1.4\n");

    const result = await extractPdf(pdfPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fields.totalAmount).toBe(512.4);
    }
  });

  it("classifies malformed stdout as bad output", async () => {
    writeStubModule(root, "print('not json')");
    const pdfPath = join(root, "fixture.pdf");
    writeFileSync(pdfPath, "%PDF-1.4\n");

    const result = await extractPdf(pdfPath);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "pdf-extractor-bad-output",
      },
    });
  });

  it("classifies slow extractors as a timeout", async () => {
    writeStubModule(root, "import time\ntime.sleep(0.2)\nprint('{}')");
    process.env.SLASHCASH_PDF_EXTRACTOR_TIMEOUT_MS = "10";
    const pdfPath = join(root, "fixture.pdf");
    writeFileSync(pdfPath, "%PDF-1.4\n");

    const result = await extractPdf(pdfPath);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "pdf-extractor-timeout",
      },
    });
  });

  it("rejects non-pdf inputs before spawning python", async () => {
    const txtPath = join(root, "fixture.txt");
    writeFileSync(txtPath, "hello");

    const result = await extractPdf(txtPath);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "pdf-extractor-unsupported-format",
      },
    });
  });
});

function writeStubModule(root: string, source: string) {
  writeFileSync(join(root, "slashcash_pdf_extractor.py"), `${source}\n`);
}
