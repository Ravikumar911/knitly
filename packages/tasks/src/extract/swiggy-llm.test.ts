import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mocks.generateText,
}));

import { extractSwiggyWithLlm } from "./swiggy-llm";

describe("extractSwiggyWithLlm", () => {
  const originalProvider = process.env.SLASHCASH_ASSISTANT_PROVIDER;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLASHCASH_ASSISTANT_PROVIDER = "ollama-local";
    const extraction = {
      parseSuccess: true,
      confidenceScore: 1.4,
      parseErrors: [],
      orderId: "236403526545349",
      amount: 208,
      currency: "INR",
      transactionDate: "2026-04-29T04:03:45.000Z",
      description: "Swiggy order - Udupi Upahar",
      restaurantName: "Udupi Upahar",
      paymentMethod: "Swiggy Money",
      invoiceNo: "0233770042900012",
      invoiceDate: "2026-04-29",
      customerAddress: "Bengaluru, Karnataka 560068",
      pincode: "560068",
      deliveryFee: 0,
      taxes: 10.8,
      discount: 75,
      packagingFee: 15,
      orderItems: [{ name: "Poori", quantity: 2, price: 190 }],
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    };
    mocks.generateText.mockResolvedValue({
      text: `\`\`\`json\n${JSON.stringify(extraction)}\n\`\`\``,
      usage: { totalTokens: 123 },
    });
  });

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.SLASHCASH_ASSISTANT_PROVIDER;
    } else {
      process.env.SLASHCASH_ASSISTANT_PROVIDER = originalProvider;
    }
  });

  it("parses plain JSON text and clamps confidence after local validation", async () => {
    const result = await extractSwiggyWithLlm(
      {
        subject: "Your Swiggy order was delivered on time",
        body: "Order ID: 236403526545349 Paid Via Swiggy Money ₹208.00",
        date: "2026-04-29T04:03:45.000Z",
      },
      [],
    );

    const call = mocks.generateText.mock.calls[0]?.[0];
    expect(call.schema).toBeUndefined();
    expect(call.output).toBeUndefined();
    expect(result.parseSuccess).toBe(true);
    expect(result.extractionConfidence).toBe(1);
    expect(result.extractionData.transaction?.restaurantName).toBe(
      "Udupi Upahar",
    );
  });

  it("reconciles a final paid amount from the email body when the model omits it", async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: JSON.stringify({
        parseSuccess: false,
        confidenceScore: 0.2,
        parseErrors: [
          "This is a delivery update email without a completed paid transaction.",
        ],
        orderId: "236008303060924",
        amount: null,
        restaurantName: "AL Khaja Resturent",
        paymentMethod: null,
        orderItems: [{ name: "Grilled Chicken", quantity: 1, price: 270 }],
        service: "FOOD_DELIVERY",
        orderType: "DELIVERY",
      }),
      usage: { totalTokens: 100 },
    });

    const result = await extractSwiggyWithLlm(
      {
        subject: "Your Swiggy order was successfully delivered",
        body: "Order ID: 236008303060924 Paid Via Credit/Debit card ₹301.00",
        date: "2026-04-24T14:25:01.000Z",
      },
      [],
    );

    expect(result.parseSuccess).toBe(true);
    expect(result.extractionConfidence).toBeGreaterThanOrEqual(0.9);
    expect(result.extractionData.transaction?.amount).toBe(301);
    expect(result.extractionData.transaction?.paymentMethod).toBe(
      "Credit/Debit card",
    );
  });

  it("rejects marketing email payloads", async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: JSON.stringify({
        parseSuccess: true,
        confidenceScore: 0.95,
        parseErrors: [],
        orderId: "123456789012345",
        amount: 600,
        restaurantName: "Promo",
      }),
      usage: { totalTokens: 50 },
    });

    const result = await extractSwiggyWithLlm(
      {
        subject: "Ravikumar, win up to ₹600 today!",
        body: "Tap to claim your reward now.",
        date: "2026-04-24T14:25:01.000Z",
      },
      [],
    );

    expect(result.parseSuccess).toBe(false);
    expect(result.parseErrors).toEqual(
      expect.arrayContaining([
        "Email appears to be marketing rather than a completed Swiggy order.",
      ]),
    );
  });

  it("treats null optional fields as missing instead of failing validation", async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: JSON.stringify({
        parseSuccess: true,
        confidenceScore: 0.9,
        parseErrors: [],
        orderId: "236008303060924",
        amount: null,
        restaurantName: "AL Khaja Resturent",
        paymentMethod: null,
        orderItems: [{ name: "Grilled Chicken", quantity: 1, price: 270 }],
        service: null,
        orderType: null,
      }),
      usage: { totalTokens: 100 },
    });

    const result = await extractSwiggyWithLlm(
      {
        subject: "Your Swiggy order was delivered",
        body: "Order ID: 236008303060924",
        date: "2026-04-24T14:25:01.000Z",
      },
      [],
    );

    expect(result.parseSuccess).toBe(false);
    expect(result.parseErrors).toEqual(
      expect.arrayContaining([
        "Extraction did not include a final paid amount.",
      ]),
    );
  });
});
