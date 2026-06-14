import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractTransactionFromEmail } from "./pipeline";

const runIntegration = process.env.VITEST_INTEGRATION === "1";

describe.skipIf(!runIntegration)(
  "extractTransactionFromEmail integration",
  () => {
    it("maps the real Python extractor output into transaction fields", async () => {
      const pdfPath = resolve(
        process.cwd(),
        "../pdf-extractor/tests/fixtures/swiggy-sample.pdf",
      );
      if (!existsSync(pdfPath)) {
        throw new Error(`Missing fixture: ${pdfPath}`);
      }

      const venvPython = resolve(
        process.cwd(),
        "../pdf-extractor/.venv/bin/python",
      );
      process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON =
        !process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON ||
        process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON === "python3"
          ? existsSync(venvPython)
            ? venvPython
            : "python3"
          : process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON;
      process.env.PYTHONPATH = resolve(process.cwd(), "../pdf-extractor/src");

      const result = await extractTransactionFromEmail({
        userId: "local-user-id",
        emailId: "integration-email",
        threadId: "integration-thread",
        subject: "Your Swiggy order",
        body: "Order ID: SWG-PDF-1001\nPaid Via UPI ₹512.40",
        date: "2026-04-22T19:42:00+05:30",
        from: "orders@swiggy.in",
        attachments: [
          {
            filename: "swiggy-sample.pdf",
            mimeType: "application/pdf",
            content: "",
            storageUrl: pdfPath,
          },
        ],
      });

      expect(result.parseSuccess).toBe(true);
      expect(result.schemaUsed).toBe("swiggy.deterministic.v1");
      expect(result.dataSource).toBe("BOTH");
      expect(result.extractionData.transaction?.amount).toBe(512.4);
      expect(result.extractionData.transaction?.orderId).toBe("SWG-PDF-1001");
      expect(result.provenance).toMatchObject({
        parser: "slashcash_pdf_extractor",
        sourceQuality: "text",
      });
    });
  },
);
