import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  extractTextFromPdf: vi.fn(),
  extractSwiggyWithLlm: vi.fn(),
  storeTransactionV2Input: vi.fn(),
}));

vi.mock("./extract-from-pdf", () => ({
  extractTextFromPdf: mocks.extractTextFromPdf,
}));

vi.mock("./swiggy-llm", () => ({
  extractSwiggyWithLlm: mocks.extractSwiggyWithLlm,
}));

vi.mock("@workspace/database", () => ({
  storeTransactionV2Input: mocks.storeTransactionV2Input,
}));

import { extractTransactionFromEmail } from "./pipeline";

describe("extractTransactionFromEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeTransactionV2Input.mockResolvedValue({ id: "txn-1" });
    mocks.extractSwiggyWithLlm.mockResolvedValue(
      llmResult({
        amount: 512.4,
        orderId: "SWG-PDF-1001",
        restaurantName: "Millet Bowl Co",
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stores LLM output from PDF text and email body", async () => {
    mocks.extractTextFromPdf.mockResolvedValue({
      ok: true,
      value: deterministicSource("/tmp/fixture.pdf"),
    });

    const result = await extractTransactionFromEmail(
      {
        userId: "local-user-id",
        emailId: "email-1",
        threadId: "thread-1",
        subject: "Your Swiggy order",
        body: "Paid Via UPI ₹512.40",
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

    expect(mocks.extractTextFromPdf).toHaveBeenCalledWith({
      attachmentPath: "/tmp/fixture.pdf",
      emailBody: "Paid Via UPI ₹512.40",
      subject: "Your Swiggy order",
    });
    expect(mocks.extractSwiggyWithLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Your Swiggy order",
        body: "Paid Via UPI ₹512.40",
      }),
      expect.arrayContaining([
        expect.objectContaining({ attachmentPath: "/tmp/fixture.pdf" }),
      ]),
    );
    expect(result.schemaUsed).toBe("swiggy.llm.v1");
    expect(result.dataSource).toBe("BOTH");
    expect(result.transactionId).toBe("txn-1");
    expect(mocks.storeTransactionV2Input).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 512.4,
        schemaUsed: "swiggy.llm.v1",
        dataSource: "BOTH",
        merchantData: expect.objectContaining({
          provenance: expect.objectContaining({
            parser: "swiggy-llm",
            sourceQuality: "text",
          }),
        }),
      }),
    );
  });

  it("falls back to the body regex when LLM extraction is unavailable", async () => {
    mocks.extractSwiggyWithLlm.mockResolvedValue(
      llmResult({
        parseSuccess: false,
        parseErrors: ["Extraction model unavailable: no-assistant-provider."],
      }),
    );

    const result = await extractTransactionFromEmail(
      {
        userId: "local-user-id",
        emailId: "email-1",
        threadId: "thread-1",
        subject: "Your Swiggy order",
        body: [
          "Order ID: SW123456789",
          "Restaurant: Meghana Foods",
          "Total: INR 348.50",
        ].join("\n"),
        date: "2026-04-22T19:42:00+05:30",
        from: "orders@swiggy.in",
        attachments: [],
      },
      { storeTransaction: false },
    );

    expect(result.parseSuccess).toBe(true);
    expect(result.schemaUsed).toBe("swiggy.fallback.v1");
    expect(result.extractionData.transaction?.amount).toBe(348.5);
    expect(mocks.extractTextFromPdf).not.toHaveBeenCalled();
  });
});

function llmResult(
  input: {
    amount?: number;
    orderId?: string;
    restaurantName?: string;
    parseSuccess?: boolean;
    parseErrors?: string[];
  } = {},
) {
  const parseSuccess = input.parseSuccess ?? true;
  return {
    parseSuccess,
    parseErrors: input.parseErrors ?? [],
    extractionConfidence: parseSuccess ? 0.92 : 0,
    dataSource: "BOTH",
    contributedByPdf: true,
    provenance: {
      parser: "swiggy-llm",
      parserVersion: "1",
      parsersUsed: ["slashcash_pdf_extractor", "pdfplumber"],
      sourceQuality: "text",
      warnings: [],
      pdfAttachmentPath: "/tmp/fixture.pdf",
      extractedAt: "2026-04-22T00:00:00.000Z",
    },
    extractionData: {
      detectedProvider: "Swiggy",
      emailType: parseSuccess ? "ORDER_CONFIRMATION" : "OTHER",
      emailSubject: "Your Swiggy order",
      parseSuccess,
      parseErrors: input.parseErrors ?? [],
      confidenceScore: parseSuccess ? 0.92 : 0,
      dataSource: "BOTH",
      merchantId: "swiggy",
      merchantCode: "SWIGGY",
      transaction: parseSuccess
        ? {
            amount: input.amount ?? 512.4,
            currency: "INR",
            type: "DEBIT",
            status: "COMPLETED",
            transactionDate: "2026-04-22T19:42:00+05:30",
            description: `Swiggy order - ${input.restaurantName ?? "Swiggy"}`,
            category: "Food",
            paymentMethod: "UPI",
            referenceIds: { orderId: input.orderId ?? "SWG-PDF-1001" },
            orderId: input.orderId ?? "SWG-PDF-1001",
            restaurantName: input.restaurantName ?? "Millet Bowl Co",
          }
        : undefined,
      swiggyMetadata: parseSuccess
        ? {
            service: "FOOD_DELIVERY",
            orderType: "DELIVERY",
          }
        : undefined,
    },
  };
}

function deterministicSource(attachmentPath: string) {
  return {
    text: "Order ID: SWG-PDF-1001\nTotal: INR 512.40",
    warnings: [],
    attachmentPath,
    extractor: "slashcash_pdf_extractor",
    extractorVersion: "0.1.0",
    pageCount: 1,
    tableCount: 0,
    sourceQuality: {
      kind: "text",
      page_count: 1,
      parsers_used: ["pdfplumber"],
      warnings: [],
    },
    extraction: {
      schema_version: "2",
      extractor: "slashcash_pdf_extractor",
      extractor_version: "0.1.0",
      merchant: "swiggy",
      confidence: 0,
      fields: {},
      raw: {
        page_count: 1,
        tables: [],
        text: "Order ID: SWG-PDF-1001\nTotal: INR 512.40",
        sources: {},
      },
      source_quality: {
        kind: "text",
        page_count: 1,
        parsers_used: ["pdfplumber"],
        warnings: [],
      },
    },
  };
}
