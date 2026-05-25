import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@workspace/database", () => ({
  getSwiggyAssistantSnapshot: vi.fn(),
}));

import { getSwiggyAssistantSnapshot } from "@workspace/database";
import {
  type AssistantQueryPlan,
  buildAssistantFinanceContext,
  buildDeterministicQueryPlan,
  shouldLoadFinanceContext,
} from "./finance-context";

const now = new Date("2026-05-25T12:00:00+05:30");
const getSwiggyAssistantSnapshotMock = vi.mocked(getSwiggyAssistantSnapshot);

type PlanExpectation = Partial<
  Pick<
    AssistantQueryPlan,
    | "intent"
    | "includeOrders"
    | "limit"
    | "services"
    | "merchantQuery"
    | "itemQuery"
  >
> & {
  dateRange?: AssistantQueryPlan["dateRange"];
  dimensions?: AssistantQueryPlan["dimensions"];
  metrics?: AssistantQueryPlan["metrics"];
  absentDimensions?: AssistantQueryPlan["dimensions"];
};

const aprilFoodDeliveryConversation =
  "user: How much did I spend on Swiggy last month?\n" +
  "assistant: In April 2026, you spent Rs 11,312 on Swiggy across 16 orders.\n" +
  "Food delivery: 13 orders, Rs 6,337\n" +
  "Instamart: 2 orders, Rs 790\n" +
  "Dineout: 1 order, Rs 4,185\n" +
  "user: Food delivery: 13 orders, Rs 6,337 really 13 ?\n" +
  "assistant: In April 2026, you spent Rs 6,337 on Swiggy food delivery across 13 orders, with an average order value of Rs 488.";

const broadAprilConversation =
  "assistant: In April 2026, you spent Rs 11,312 on Swiggy across 16 orders.\n" +
  "Food delivery: 13 orders, Rs 6,337\n" +
  "Instamart: 2 orders, Rs 790\n" +
  "Dineout: 1 order, Rs 4,185";

const mayDineoutConversation =
  "assistant: In May 2026, your Dineout spend is Rs 2,270 across 1 order.";

beforeEach(() => {
  getSwiggyAssistantSnapshotMock.mockReset();
});

function expectPlan(
  userText: string,
  expected: PlanExpectation,
  conversationText = "",
) {
  expect(shouldLoadFinanceContext(userText, conversationText)).toBe(true);
  const plan = buildDeterministicQueryPlan({
    userText,
    conversationText,
    now,
  });
  expect(plan).not.toBeNull();
  if (!plan) return;

  if (expected.intent) expect(plan.intent).toBe(expected.intent);
  if (expected.includeOrders !== undefined) {
    expect(plan.includeOrders).toBe(expected.includeOrders);
  }
  if (expected.limit !== undefined) expect(plan.limit).toBe(expected.limit);
  if (expected.services) expect(plan.services).toEqual(expected.services);
  if (expected.merchantQuery !== undefined) {
    expect(plan.merchantQuery).toBe(expected.merchantQuery);
  }
  if (expected.itemQuery !== undefined) {
    expect(plan.itemQuery).toBe(expected.itemQuery);
  }
  if (expected.dateRange) expect(plan.dateRange).toEqual(expected.dateRange);
  if (expected.dimensions) {
    expect(plan.dimensions).toEqual(
      expect.arrayContaining(expected.dimensions),
    );
  }
  if (expected.metrics) {
    expect(plan.metrics).toEqual(expect.arrayContaining(expected.metrics));
  }
  for (const dimension of expected.absentDimensions ?? []) {
    expect(plan.dimensions).not.toContain(dimension);
  }

  return plan;
}

describe("buildDeterministicQueryPlan", () => {
  const customerQuestionCases: Array<{
    question: string;
    expected: PlanExpectation;
  }> = [
    {
      question: "How much did I spend on Swiggy last month?",
      expected: {
        intent: "summary",
        services: [],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "Show my Swiggy orders last month",
      expected: {
        intent: "details",
        includeOrders: true,
        dimensions: ["order"],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "List all 16 Swiggy orders from April 2026",
      expected: {
        intent: "details",
        includeOrders: true,
        limit: 16,
        dimensions: ["order"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "How much did I spend on food delivery in April?",
      expected: {
        services: ["foodDelivery"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "How much did I spend on Instamart in April 2026?",
      expected: {
        services: ["instamart"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "Dineout spend this month",
      expected: {
        services: ["dineout"],
        dateRange: {
          label: "this month",
          startDate: "2026-05-01",
          endDate: "2026-05-25",
        },
      },
    },
    {
      question: "Compare Instamart vs food delivery this quarter",
      expected: {
        intent: "compare",
        services: ["instamart", "foodDelivery"],
        dimensions: ["service"],
        dateRange: {
          label: "this quarter",
          startDate: "2026-04-01",
          endDate: "2026-05-25",
        },
      },
    },
    {
      question: "What's my top restaurant by orders?",
      expected: {
        intent: "rank",
        dimensions: ["restaurant"],
      },
    },
    {
      question: "Where did I order from most last month?",
      expected: {
        intent: "rank",
        dimensions: ["restaurant"],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "Which restaurant did I spend the most at in April?",
      expected: {
        intent: "rank",
        dimensions: ["restaurant"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "Show my Subway orders",
      expected: {
        intent: "details",
        includeOrders: true,
        merchantQuery: "Subway",
        dimensions: ["order"],
      },
    },
    {
      question: "How many times did I order from KFC?",
      expected: {
        merchantQuery: "KFC",
        absentDimensions: ["hour", "order"],
      },
    },
    {
      question: "What did I buy from Instamart?",
      expected: {
        intent: "details",
        includeOrders: true,
        services: ["instamart"],
        dimensions: ["service", "item", "order"],
      },
    },
    {
      question: "Top grocery items last month",
      expected: {
        intent: "rank",
        services: ["instamart"],
        dimensions: ["item"],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "Did I order Chicken Kabab?",
      expected: {
        itemQuery: "Chicken Kabab",
        services: ["foodDelivery"],
        dimensions: ["item"],
      },
    },
    {
      question: "How many times did I order Chicken Kabab?",
      expected: {
        itemQuery: "Chicken Kabab",
        services: ["foodDelivery"],
        dimensions: ["item"],
        absentDimensions: ["hour", "order"],
      },
    },
    {
      question: "whats my fav food ?",
      expected: {
        intent: "rank",
        services: ["foodDelivery"],
        dimensions: ["item"],
        absentDimensions: ["restaurant"],
      },
    },
    {
      question: "What is my most expensive Swiggy order?",
      expected: {
        intent: "extreme",
        limit: 1,
        dimensions: ["order"],
        absentDimensions: ["month"],
      },
    },
    {
      question: "What was my biggest Dineout bill?",
      expected: {
        intent: "extreme",
        limit: 1,
        services: ["dineout"],
        dimensions: ["order"],
      },
    },
    {
      question: "Average order value last month",
      expected: {
        services: [],
        itemQuery: null,
        metrics: ["averageOrderValue"],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "How much delivery fee did I pay last month?",
      expected: {
        dimensions: ["fee"],
        metrics: ["deliveryFee"],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "How much did I save with discounts?",
      expected: {
        dimensions: ["fee"],
        metrics: ["discount"],
      },
    },
    {
      question: "Payment method breakdown last month",
      expected: {
        dimensions: ["paymentMethod"],
        absentDimensions: ["order"],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "Weekend vs weekday spend last month",
      expected: {
        intent: "compare",
        dimensions: ["dayOfWeek"],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "Which day do I usually order Swiggy?",
      expected: {
        dimensions: ["dayOfWeek", "hour"],
      },
    },
    {
      question: "When do I usually order Swiggy?",
      expected: {
        dimensions: ["dayOfWeek", "hour"],
      },
    },
    {
      question: "Show spending trends for my last 10 orders",
      expected: {
        intent: "trend",
        includeOrders: true,
        limit: 10,
        services: [],
        dimensions: ["month", "order"],
      },
    },
    {
      question: "Monthly Swiggy trend this year",
      expected: {
        intent: "trend",
        dimensions: ["month"],
        dateRange: {
          label: "this year",
          startDate: "2026-01-01",
          endDate: "2026-05-25",
        },
      },
    },
    {
      question: "What did I spend yesterday?",
      expected: {
        dateRange: {
          label: "yesterday",
          startDate: "2026-05-24",
          endDate: "2026-05-24",
        },
      },
    },
    {
      question: "Show today's Swiggy orders",
      expected: {
        intent: "details",
        includeOrders: true,
        dimensions: ["order"],
        dateRange: {
          label: "today",
          startDate: "2026-05-25",
          endDate: "2026-05-25",
        },
      },
    },
  ];

  it.each(customerQuestionCases)(
    "plans customer question: $question",
    ({ question, expected }) => {
      expectPlan(question, expected);
    },
  );

  const followUpQuestionCases: Array<{
    question: string;
    conversationText: string;
    expected: PlanExpectation;
  }> = [
    {
      question: "give me detail ?",
      conversationText: aprilFoodDeliveryConversation,
      expected: {
        intent: "details",
        includeOrders: true,
        itemQuery: null,
        services: ["foodDelivery"],
        limit: 13,
        dimensions: ["order"],
        absentDimensions: ["item"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "show those orders",
      conversationText: aprilFoodDeliveryConversation,
      expected: {
        intent: "details",
        includeOrders: true,
        services: ["foodDelivery"],
        limit: 13,
        dimensions: ["order"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "list them",
      conversationText: broadAprilConversation,
      expected: {
        intent: "details",
        includeOrders: true,
        services: [],
        limit: 16,
        dimensions: ["order"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "what about Instamart?",
      conversationText: broadAprilConversation,
      expected: {
        services: ["instamart"],
        includeOrders: false,
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "and Dineout?",
      conversationText: broadAprilConversation,
      expected: {
        services: ["dineout"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "food delivery only",
      conversationText: broadAprilConversation,
      expected: {
        services: ["foodDelivery"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "which restaurants?",
      conversationText: broadAprilConversation,
      expected: {
        dimensions: ["restaurant"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "top items?",
      conversationText: aprilFoodDeliveryConversation,
      expected: {
        intent: "rank",
        services: ["foodDelivery"],
        dimensions: ["item"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "break it down by payment",
      conversationText: broadAprilConversation,
      expected: {
        dimensions: ["paymentMethod"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "what was the average?",
      conversationText: broadAprilConversation,
      expected: {
        metrics: ["averageOrderValue"],
        dateRange: {
          label: "April 2026",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "same for last month?",
      conversationText: mayDineoutConversation,
      expected: {
        services: ["dineout"],
        dateRange: {
          label: "last month",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
      },
    },
    {
      question: "what about March?",
      conversationText: broadAprilConversation,
      expected: {
        services: [],
        dateRange: {
          label: "March 2026",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
        },
      },
    },
  ];

  it.each(followUpQuestionCases)(
    "plans follow-up question: $question",
    ({ question, conversationText, expected }) => {
      expectPlan(question, expected, conversationText);
    },
  );

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
      conversationText: aprilFoodDeliveryConversation,
      now,
    });

    expect(plan).toMatchObject({
      intent: "details",
      includeOrders: true,
      itemQuery: null,
      services: ["foodDelivery"],
      limit: 13,
      dateRange: {
        label: "April 2026",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      },
    });
  });

  it("loads local data for terse order-detail follow-ups", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "give me detail ?",
      conversationText: aprilFoodDeliveryConversation,
      now,
    });

    expect(
      shouldLoadFinanceContext(
        "give me detail ?",
        aprilFoodDeliveryConversation,
      ),
    ).toBe(true);
    expect(plan).toMatchObject({
      intent: "details",
      includeOrders: true,
      itemQuery: null,
      services: ["foodDelivery"],
      limit: 13,
      dateRange: {
        label: "April 2026",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      },
    });
    expect(plan?.dimensions).toContain("order");
    expect(plan?.dimensions).not.toContain("item");
  });

  it("keeps broad Swiggy detail follow-ups broad", () => {
    const conversation =
      "assistant: In April 2026, you spent Rs 11,312 on Swiggy across 16 orders.\n" +
      "Food delivery: 13 orders, Rs 6,337\n" +
      "Instamart: 2 orders, Rs 790\n" +
      "Dineout: 1 order, Rs 4,185";
    const plan = buildDeterministicQueryPlan({
      userText: "give me details",
      conversationText: conversation,
      now,
    });

    expect(plan).toMatchObject({
      services: [],
      limit: 16,
      dateRange: {
        label: "April 2026",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
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

describe("buildAssistantFinanceContext", () => {
  it("fetches the full prior service-specific order list for terse follow-ups", async () => {
    getSwiggyAssistantSnapshotMock.mockResolvedValueOnce({
      dataRange: {
        startDate: "2025-05-02",
        endDate: "2026-05-23",
        transactionCount: 135,
      },
      totals: {
        spend: 6337,
        orders: 13,
        averageOrderValue: 487.46,
      },
      serviceBreakdown: [
        {
          service: "foodDelivery",
          label: "Food delivery",
          spend: 6337,
          orders: 13,
        },
      ],
      topRestaurantsByOrders: [],
      topRestaurantsBySpend: [],
      topFoodItems: [],
      topInstamartItems: [],
      paymentBreakdown: [],
      monthlyTrend: [],
      dayOfWeekBreakdown: [],
      hourBreakdown: [],
      feeSummary: {
        totalDeliveryFee: 0,
        averageDeliveryFee: 0,
        totalDiscount: 0,
        averageDiscount: 0,
      },
      topOrdersBySpend: [],
      recentOrders: [
        {
          date: "2026-04-30",
          orderId: "236437869304157",
          amount: 510,
          service: "foodDelivery",
          merchant: "KFC",
          description: null,
          paymentMethod: "Swiggy Money",
          items: [],
        },
      ],
      dataQualityNotes: [],
    });

    const queryPlan = buildDeterministicQueryPlan({
      userText: "give me detail ?",
      conversationText: aprilFoodDeliveryConversation,
      now,
    });
    const context = await buildAssistantFinanceContext({
      userId: "local",
      userText: "give me detail ?",
      conversationText: aprilFoodDeliveryConversation,
      queryPlan,
      now,
    });

    expect(getSwiggyAssistantSnapshotMock).toHaveBeenCalledWith("local", {
      startDate: new Date("2026-04-01T00:00:00"),
      endDate: new Date("2026-04-30T23:59:59.999"),
      recentOrderLimit: 13,
      recentOnly: false,
      topLimit: 10,
      services: ["foodDelivery"],
      merchantQuery: undefined,
      itemQuery: undefined,
    });
    expect(context?.system).toContain("Order details in range:");
  });
});
