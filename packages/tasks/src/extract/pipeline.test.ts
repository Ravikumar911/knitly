import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  extractFromEmailSources: vi.fn(),
  extractTextFromPdf: vi.fn(),
  storeTransactionV2Input: vi.fn(),
}));

vi.mock("./extract-from-email-body", () => ({
  extractFromEmailSources: mocks.extractFromEmailSources,
}));

vi.mock("./extract-from-pdf", () => ({
  extractTextFromPdf: mocks.extractTextFromPdf,
}));

vi.mock("@workspace/database", () => ({
  storeTransactionV2Input: mocks.storeTransactionV2Input,
}));

import { extractTransactionFromEmail } from "./pipeline";

describe("extractTransactionFromEmail", () => {
  const previousSkipAi = process.env.SLASHCASH_SYNC_SKIP_AI;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SLASHCASH_SYNC_SKIP_AI;
    mocks.storeTransactionV2Input.mockResolvedValue({ id: "txn-1" });
  });

  afterEach(() => {
    if (previousSkipAi === undefined) {
      delete process.env.SLASHCASH_SYNC_SKIP_AI;
    } else {
      process.env.SLASHCASH_SYNC_SKIP_AI = previousSkipAi;
    }
  });

  it("passes email body and Docling PDF text through one model call", async () => {
    mocks.extractTextFromPdf.mockResolvedValue({
      ok: true,
      value: {
        text: [
          "Swiggy Invoice",
          "Order ID: SWG-PDF-1001",
          "Restaurant: Millet Bowl Co",
          "Total: INR 512.40",
        ].join("\n"),
        warnings: [],
        attachmentPath: "/tmp/fixture.pdf",
        extractor: "docling",
        extractorVersion: "2.88.0",
        pageCount: 1,
        tableCount: 0,
      },
    });
    mocks.extractFromEmailSources.mockResolvedValue({
      extractionData: {
        detectedProvider: "Swiggy",
        emailType: "ORDER_CONFIRMATION",
        emailSubject: "Your Swiggy order",
        parseSuccess: true,
        parseErrors: [],
        confidenceScore: 0.92,
        dataSource: "BOTH",
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
      merchantId: "swiggy",
      merchantCode: "SWIGGY",
      schemaUsed: "swiggy.sources.v1",
      extractionConfidence: 0.92,
      parseSuccess: true,
      parseErrors: [],
    });

    const result = await extractTransactionFromEmail(
      {
        userId: "local-user-id",
        emailId: "email-1",
        threadId: "thread-1",
        subject: "Your Swiggy order",
        body: "Total in email: INR 348.50",
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

    expect(mocks.extractFromEmailSources).toHaveBeenCalledOnce();
    expect(mocks.extractFromEmailSources).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Total in email: INR 348.50",
      }),
      expect.anything(),
      expect.objectContaining({
        storeTransaction: false,
        pdfTextSources: [
          expect.objectContaining({
            text: expect.stringContaining("Total: INR 512.40"),
            attachmentPath: "/tmp/fixture.pdf",
          }),
        ],
      }),
    );
    expect(result.schemaUsed).toBe("swiggy.sources.v1");
    expect(result.dataSource).toBe("BOTH");
    expect(result.transactionId).toBe("txn-1");
    expect(mocks.storeTransactionV2Input).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 512.4,
        schemaUsed: "swiggy.sources.v1",
        dataSource: "BOTH",
      }),
    );
  });

  it("falls back to the body regex when neither AI nor PDF extraction produce a candidate", async () => {
    process.env.SLASHCASH_SYNC_SKIP_AI = "1";
    mocks.extractTextFromPdf.mockResolvedValue({
      ok: true,
      value: {
        text: "This PDF text is ignored while AI is skipped.",
        warnings: [],
        attachmentPath: "/tmp/fixture.pdf",
        extractor: "docling",
        extractorVersion: "2.88.0",
        pageCount: 1,
        tableCount: 0,
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
        attachments: [],
      },
      { storeTransaction: false },
    );

    expect(result.parseSuccess).toBe(true);
    expect(result.schemaUsed).toBe("swiggy.fallback.v1");
    expect(result.extractionData.transaction?.amount).toBe(348.5);
    expect(mocks.extractFromEmailSources).not.toHaveBeenCalled();
  });
});
