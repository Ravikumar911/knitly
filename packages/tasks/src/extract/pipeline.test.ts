import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  extractTextFromPdf: vi.fn(),
  storeTransactionV2Input: vi.fn(),
}));

vi.mock("./extract-from-pdf", () => ({
  extractTextFromPdf: mocks.extractTextFromPdf,
}));

vi.mock("@workspace/database", () => ({
  storeTransactionV2Input: mocks.storeTransactionV2Input,
}));

import { extractTransactionFromEmail } from "./pipeline";

describe("extractTransactionFromEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeTransactionV2Input.mockResolvedValue({ id: "txn-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stores deterministic Python output without invoking a model", async () => {
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
    expect(result.schemaUsed).toBe("swiggy.deterministic.v1");
    expect(result.dataSource).toBe("BOTH");
    expect(result.transactionId).toBe("txn-1");
    expect(mocks.storeTransactionV2Input).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 512.4,
        schemaUsed: "swiggy.deterministic.v1",
        dataSource: "BOTH",
        merchantData: expect.objectContaining({
          provenance: expect.objectContaining({
            parser: "slashcash_pdf_extractor",
            sourceQuality: "text",
          }),
        }),
      }),
    );
  });

  it("falls back to the body regex when Python extraction is unavailable", async () => {
    mocks.extractTextFromPdf.mockResolvedValue({
      ok: false,
      message: "The PDF extractor is disabled by environment.",
    });

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
  });
});

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
      confidence: 0.99,
      fields: {
        order_id: "SWG-PDF-1001",
        invoice_no: "INV-1",
        invoice_date: "2026-04-22",
        restaurant_name: "Millet Bowl Co",
        restaurant_address: null,
        customer_address: "Indiranagar 560038",
        pincode: "560038",
        invoice_total: 512.4,
        paid_amount: 512.4,
        item_subtotal: null,
        tax_total: null,
        platform_fee: null,
        delivery_fee: null,
        packaging_fee: null,
        discount_total: null,
        payment_method: "UPI",
        service_type: "FOOD_DELIVERY",
        items: [],
      },
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
