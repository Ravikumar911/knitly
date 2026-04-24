import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  extractFromEmailBody: vi.fn(),
  extractFromPdf: vi.fn(),
  reconcileExtractions: vi.fn(),
  storeTransactionV2Input: vi.fn(),
}));

vi.mock("./extract-from-email-body", () => ({
  extractFromEmailBody: mocks.extractFromEmailBody,
}));

vi.mock("./extract-from-pdf", () => ({
  extractFromPdf: mocks.extractFromPdf,
}));

vi.mock("./reconcile-extractions", () => ({
  reconcileExtractions: mocks.reconcileExtractions,
}));

vi.mock("@workspace/database", () => ({
  storeTransactionV2Input: mocks.storeTransactionV2Input,
}));

import { extractTransactionFromEmail } from "./pipeline";

describe("extractTransactionFromEmail", () => {
  const previousSkipAi = process.env.SLASHCASH_SYNC_SKIP_AI;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLASHCASH_SYNC_SKIP_AI = "1";
    mocks.storeTransactionV2Input.mockResolvedValue({ id: "txn-1" });
  });

  afterEach(() => {
    if (previousSkipAi === undefined) {
      delete process.env.SLASHCASH_SYNC_SKIP_AI;
    } else {
      process.env.SLASHCASH_SYNC_SKIP_AI = previousSkipAi;
    }
  });

  it("prefers the PDF lane when AI is skipped and a PDF candidate exists", async () => {
    mocks.extractFromPdf.mockResolvedValue({
      ok: true,
      value: {
        extractionData: {
          detectedProvider: "Swiggy",
          emailType: "ORDER_CONFIRMATION",
          emailSubject: "Your Swiggy order",
          parseSuccess: true,
          parseErrors: [],
          confidenceScore: 0.92,
          dataSource: "PDF_ATTACHMENT",
          transaction: {
            amount: 512.4,
            currency: "INR",
            type: "DEBIT",
            status: "COMPLETED",
            transactionDate: "2026-04-22T19:42:00+05:30",
            description: "Swiggy order - Millet Bowl Co",
            orderId: "SWG-PDF-1001",
            referenceIds: { orderId: "SWG-PDF-1001" },
          },
        },
        extractionConfidence: 0.92,
        parseErrors: [],
        warnings: [],
        schemaUsed: "swiggy.docling.v1",
        dataSource: "PDF_ATTACHMENT",
        attachmentPath: "/tmp/fixture.pdf",
        contributedByPdf: true,
      },
    });

    const result = await extractTransactionFromEmail(
      {
        userId: "local-user-id",
        emailId: "email-1",
        threadId: "thread-1",
        subject: "Your Swiggy order",
        body: "Total: INR 348.50",
        date: "2026-04-22T19:42:00+05:30",
        from: "orders@swiggy.in",
        attachments: [
          {
            filename: "invoice.pdf",
            mimeType: "application/pdf",
            content: "base64",
            storageUrl: "/tmp/fixture.pdf",
          },
        ],
      },
      { parsedEmailId: "email-1", storeTransaction: true },
    );

    expect(result.schemaUsed).toBe("swiggy.docling.v1");
    expect(result.dataSource).toBe("PDF_ATTACHMENT");
    expect(result.transactionId).toBe("txn-1");
    expect(mocks.storeTransactionV2Input).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 512.4,
        schemaUsed: "swiggy.docling.v1",
        dataSource: "PDF_ATTACHMENT",
      }),
    );
  });

  it("falls back to the body regex when neither AI nor PDF extraction produce a candidate", async () => {
    mocks.extractFromPdf.mockResolvedValue({
      ok: false,
      message: "extractor failed",
    });

    const result = await extractTransactionFromEmail(
      {
        userId: "local-user-id",
        emailId: "email-1",
        threadId: "thread-1",
        subject: "Your Swiggy order",
        body: [
          "Order ID: SWG-TEST-12345",
          "Restaurant: Millet Bowl Co",
          "Total: INR 348.50",
        ].join("\n"),
        date: "2026-04-22T19:42:00+05:30",
        from: "orders@swiggy.in",
      },
      { storeTransaction: false },
    );

    expect(result.parseSuccess).toBe(true);
    expect(result.schemaUsed).toBe("swiggy.fallback.v1");
    expect(result.extractionData.transaction?.amount).toBe(348.5);
  });
});
