import type { LanguageModel } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  storeTransactionV2Input: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateObject: mocks.generateObject,
  };
});

vi.mock("@workspace/database", () => ({
  storeTransactionV2Input: mocks.storeTransactionV2Input,
}));

import {
  buildEmailBodyPrompt,
  extractFromEmailBody,
} from "./extract-from-email-body";

describe("buildEmailBodyPrompt", () => {
  it("uses only headers and body text", () => {
    const prompt = buildEmailBodyPrompt("BASE", {
      from: "orders@swiggy.in",
      subject: "Your Swiggy order",
      date: "2026-04-22T19:42:00+05:30",
      body: "Order total INR 482.50",
    });

    expect(prompt).toContain("EMAIL BODY:");
    expect(prompt).toContain("Order total INR 482.50");
    expect(prompt).not.toContain("ATTACHMENTS:");
  });
});

describe("extractFromEmailBody", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not pass attachment filenames or content into the model prompt", async () => {
    mocks.generateObject.mockResolvedValue({
      object: {
        detectedProvider: "Swiggy",
        emailType: "ORDER_CONFIRMATION",
        emailSubject: "Your Swiggy order",
        parseSuccess: true,
        parseErrors: [],
        confidenceScore: 0.91,
        dataSource: "EMAIL_BODY",
        transaction: {
          amount: 482.5,
          currency: "INR",
          type: "DEBIT",
          status: "COMPLETED",
          description: "Swiggy order - Meghana Foods",
          referenceIds: {},
          orderId: "SW123456789",
        },
      },
    });

    await extractFromEmailBody(
      {
        userId: "local-user-id",
        emailId: "email-1",
        threadId: "thread-1",
        subject: "Your Swiggy order",
        body: "Order total INR 482.50",
        date: "2026-04-22T19:42:00+05:30",
        from: "orders@swiggy.in",
        attachments: [
          {
            filename: "invoice.pdf",
            mimeType: "application/pdf",
            content: "VGhpcyBpcyBub3QgYSByZWFsIFBERg==",
          },
        ],
      },
      {} as LanguageModel,
    );

    expect(mocks.generateObject).toHaveBeenCalledOnce();
    const call = mocks.generateObject.mock.calls[0]?.[0];
    expect(call.prompt).toContain("Order total INR 482.50");
    expect(call.prompt).not.toContain("invoice.pdf");
    expect(call.prompt).not.toContain("VGhpcyBpcyBub3QgYSByZWFsIFBERg==");
    expect(call.prompt).not.toContain("ATTACHMENTS:");
    expect(mocks.storeTransactionV2Input).not.toHaveBeenCalled();
  });
});
