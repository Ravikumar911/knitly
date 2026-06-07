import { describe, expect, it } from "vitest";
import { identifyMerchant } from ".";
import { buildMerchantBasedGmailSearchQuery } from "../utils";

describe("identifyMerchant", () => {
  it("matches root domains for wildcard merchant patterns", async () => {
    const result = await identifyMerchant({
      userId: "local-user-id",
      emailId: "email-1",
      threadId: "thread-1",
      subject: "Receipt",
      body: "",
      date: "2026-04-22T00:00:00.000Z",
      from: "orders@swiggy.in",
      attachments: [],
    });

    expect(result?.merchant.id).toBe("swiggy");
    expect(result?.matchedPatterns.email).toContain("*.swiggy.in");
  });

  it("matches display-name From headers for wildcard merchant patterns", async () => {
    const result = await identifyMerchant({
      userId: "local-user-id",
      emailId: "email-2",
      threadId: "thread-2",
      subject: "Receipt",
      body: "",
      date: "2026-04-22T00:00:00.000Z",
      from: '"Swiggy" <order.update@swiggy.in>',
      attachments: [],
    });

    expect(result?.merchant.id).toBe("swiggy");
    expect(result?.matchedPatterns.email).toContain("*.swiggy.in");
  });

  it("does not match wildcard domains inside longer hostnames", async () => {
    const result = await identifyMerchant({
      userId: "local-user-id",
      emailId: "email-3",
      threadId: "thread-3",
      subject: "Receipt",
      body: "",
      date: "2026-04-22T00:00:00.000Z",
      from: "spoof@swiggy.in.evil.example",
      attachments: [],
    });

    expect(result).toBeNull();
  });

  it("does not classify generic Uber ride receipts as Uber Eats", async () => {
    const result = await identifyMerchant({
      userId: "local-user-id",
      emailId: "email-uber-trip-1",
      threadId: "uber-trip-thread-1",
      subject: "Your trip with Uber",
      body: [
        "Thanks for riding, Ravi",
        "Total $18.45",
        "Charged to Visa ending in 4242",
        "Pickup: Market St",
        "Dropoff: Mission St",
      ].join("\n"),
      date: "2026-04-22T00:00:00.000Z",
      from: "receipts@uber.com",
      attachments: [],
    });

    expect(result).toBeNull();
  });
});

describe("buildMerchantBasedGmailSearchQuery (dynamic from registry)", () => {
  it("includes domains for all active merchants including newly added Uber Eats and DoorDash", () => {
    const q = buildMerchantBasedGmailSearchQuery(365);
    expect(q).toContain("swiggy.in");
    expect(q).toContain("swiggy.com");
    expect(q).toContain("uber.com");
    expect(q).toContain("ubereats.com");
    expect(q).toContain("doordash.com");
    expect(q).toMatch(/newer_than:365d/);
  });

  it("does not contain wildcards in the final from clause", () => {
    const q = buildMerchantBasedGmailSearchQuery(180);
    expect(q).not.toContain("*.");
  });
});
