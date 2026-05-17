import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/database", () => ({
  getSwiggyAssistantSnapshot: vi.fn(),
}));

import {
  buildDeterministicQueryPlan,
  shouldLoadFinanceContext,
} from "./finance-context";

const now = new Date("2026-04-26T12:00:00+05:30");

describe("buildDeterministicQueryPlan", () => {
  it("does not inherit Instamart from prior broad Swiggy answers", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "Which month had my highest Swiggy spend?",
      conversationText:
        "assistant: Food delivery: 5 orders, Rs 2,754\nInstamart: 1 order, Rs 226",
      now,
    });

    expect(plan?.intent).toBe("extreme");
    expect(plan?.dimensions).toContain("month");
    expect(plan?.services).toEqual([]);
  });

  it("uses the prior month and count for order-detail follow-ups", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "get details about the 13 order",
      conversationText:
        "assistant: Your highest Swiggy spend was in May 2025, totaling Rs 14,182 over 13 orders.",
      now,
    });

    expect(plan).toMatchObject({
      intent: "details",
      includeOrders: true,
      limit: 13,
      dateRange: {
        label: "May 2025",
        startDate: "2025-05-01",
        endDate: "2025-05-31",
      },
    });
  });

  it("does not inherit Instamart for last-order trend requests", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "Show spending trends for my last 10 orders",
      conversationText: "assistant: Instamart: 1 order, Rs 226",
      now,
    });

    expect(plan?.services).toEqual([]);
    expect(plan?.includeOrders).toBe(true);
    expect(plan?.limit).toBe(10);
  });

  it("plans favorite food as a food item ranking", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "whats my fav food ?",
      now,
    });

    expect(shouldLoadFinanceContext("whats my fav food ?")).toBe(true);
    expect(plan?.intent).toBe("rank");
    expect(plan?.dimensions).toContain("item");
    expect(plan?.dimensions).not.toContain("restaurant");
    expect(plan?.services).toEqual(["foodDelivery"]);
  });

  it("infers restaurant filters from natural order-list phrasing", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "show my Subway orders",
      now,
    });

    expect(plan).toMatchObject({
      intent: "details",
      includeOrders: true,
      merchantQuery: "Subway",
    });
    expect(plan?.dimensions).toContain("order");
  });

  it("keeps Instamart as a service filter, not a merchant filter", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "what did I buy from Instamart?",
      now,
    });

    expect(plan).toMatchObject({
      intent: "details",
      includeOrders: true,
      merchantQuery: null,
      services: ["instamart"],
    });
    expect(plan?.dimensions).toEqual(
      expect.arrayContaining(["service", "item", "order"]),
    );
  });

  it("handles last-order requests as one recent order", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "what was my last Swiggy order?",
      now,
    });

    expect(plan).toMatchObject({
      includeOrders: true,
      limit: 1,
    });
    expect(plan?.dimensions).toContain("order");
  });

  it("handles item count questions without treating times as hour", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "how many times did I order Chicken Kabab?",
      now,
    });

    expect(plan).toMatchObject({
      itemQuery: "Chicken Kabab",
      includeOrders: false,
      services: ["foodDelivery"],
    });
    expect(plan?.dimensions).toContain("item");
    expect(plan?.dimensions).not.toContain("hour");
    expect(plan?.dimensions).not.toContain("order");
  });

  it("handles usual ordering-time questions as day and hour summaries", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "when do I usually order Swiggy?",
      now,
    });

    expect(plan?.dimensions).toEqual(
      expect.arrayContaining(["dayOfWeek", "hour"]),
    );
    expect(plan?.dimensions).not.toContain("order");
  });

  it("plans most expensive order without forcing a month trend", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "what is my most expensive Swiggy order?",
      now,
    });

    expect(plan?.intent).toBe("extreme");
    expect(plan?.dimensions).toContain("order");
    expect(plan?.dimensions).not.toContain("month");
    expect(plan?.limit).toBe(1);
  });

  it("does not treat food delivery service comparisons as item questions", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "compare Instamart and food delivery this quarter",
      now,
    });

    expect(plan?.intent).toBe("compare");
    expect(plan?.dimensions).toContain("service");
    expect(plan?.dimensions).not.toContain("item");
    expect(plan?.services).toEqual(["instamart", "foodDelivery"]);
  });
});
