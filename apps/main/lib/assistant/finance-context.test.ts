import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@workspace/database", () => ({
  getAssistantFinanceSnapshot: vi.fn(),
}));

import {
  type AssistantFinanceSnapshot,
  getAssistantFinanceSnapshot,
} from "@workspace/database";
import {
  type AssistantQueryPlan,
  buildAssistantFinanceContext,
  buildDeterministicQueryPlan,
  shouldLoadFinanceContext,
} from "./finance-context";

const now = new Date(2026, 4, 25, 12, 0, 0);
const getAssistantFinanceSnapshotMock = vi.mocked(getAssistantFinanceSnapshot);

type PlanExpectation = Partial<
  Pick<
    AssistantQueryPlan,
    | "intent"
    | "includeOrders"
    | "limit"
    | "merchantIds"
    | "serviceTypes"
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
  "Grocery: 2 orders, Rs 790\n" +
  "Dining: 1 order, Rs 4,185\n" +
  "user: Food delivery: 13 orders, Rs 6,337 really 13 ?\n" +
  "assistant: In April 2026, you spent Rs 6,337 on Swiggy food delivery across 13 orders, with an average order value of Rs 488.";

const broadAprilConversation =
  "assistant: In April 2026, you spent Rs 11,312 on Swiggy across 16 orders.\n" +
  "Food delivery: 13 orders, Rs 6,337\n" +
  "Grocery: 2 orders, Rs 790\n" +
  "Dining: 1 order, Rs 4,185";

const mayDiningConversation =
  "assistant: In May 2026, your dining spend is Rs 2,270 across 1 order.";

beforeEach(() => {
  getAssistantFinanceSnapshotMock.mockReset();
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
  if (!plan) return plan;

  if (expected.intent) expect(plan.intent).toBe(expected.intent);
  if (expected.includeOrders !== undefined) {
    expect(plan.includeOrders).toBe(expected.includeOrders);
  }
  if (expected.limit !== undefined) expect(plan.limit).toBe(expected.limit);
  if (expected.merchantIds) {
    expect(plan.merchantIds).toEqual(expected.merchantIds);
  }
  if (expected.serviceTypes) {
    expect(plan.serviceTypes).toEqual(expected.serviceTypes);
  }
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
        merchantIds: ["swiggy"],
        serviceTypes: [],
        dateRange: april2026("last month"),
      },
    },
    {
      question: "Show my Swiggy orders last month",
      expected: {
        intent: "details",
        includeOrders: true,
        merchantIds: ["swiggy"],
        dimensions: ["order"],
        dateRange: april2026("last month"),
      },
    },
    {
      question: "List all 16 Swiggy orders from April 2026",
      expected: {
        intent: "details",
        includeOrders: true,
        merchantIds: ["swiggy"],
        limit: 16,
        dimensions: ["order"],
        dateRange: april2026(),
      },
    },
    {
      question: "How much did I spend on food delivery in April?",
      expected: {
        serviceTypes: ["foodDelivery"],
        dateRange: april2026(),
      },
    },
    {
      question: "How much did I spend on grocery in April 2026?",
      expected: {
        serviceTypes: ["grocery"],
        dateRange: april2026(),
      },
    },
    {
      question: "How much did I spend on Instamart in April 2026?",
      expected: {
        serviceTypes: ["grocery"],
        dateRange: april2026(),
      },
    },
    {
      question: "Dining spend this month",
      expected: {
        serviceTypes: ["dineout"],
        dateRange: {
          label: "this month",
          startDate: "2026-05-01",
          endDate: "2026-05-25",
        },
      },
    },
    {
      question: "Dineout spend this month",
      expected: {
        serviceTypes: ["dineout"],
        dateRange: {
          label: "this month",
          startDate: "2026-05-01",
          endDate: "2026-05-25",
        },
      },
    },
    {
      question: "Compare grocery vs food delivery this quarter",
      expected: {
        intent: "compare",
        serviceTypes: ["grocery", "foodDelivery"],
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
        dimensions: ["merchant"],
      },
    },
    {
      question: "Where did I order from most last month?",
      expected: {
        intent: "rank",
        dimensions: ["merchant"],
        dateRange: april2026("last month"),
      },
    },
    {
      question: "Which restaurant did I spend the most at in April?",
      expected: {
        intent: "rank",
        dimensions: ["merchant"],
        dateRange: april2026(),
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
      question: "What did I buy from grocery?",
      expected: {
        intent: "details",
        includeOrders: true,
        serviceTypes: ["grocery"],
        merchantQuery: null,
        dimensions: ["service", "item", "order"],
      },
    },
    {
      question: "What did I buy from Instamart?",
      expected: {
        intent: "details",
        includeOrders: true,
        serviceTypes: ["grocery"],
        merchantQuery: null,
        dimensions: ["service", "item", "order"],
      },
    },
    {
      question: "Top grocery items last month",
      expected: {
        intent: "rank",
        serviceTypes: ["grocery"],
        dimensions: ["item"],
        dateRange: april2026("last month"),
      },
    },
    {
      question: "Did I order Chicken Kabab?",
      expected: {
        itemQuery: "Chicken Kabab",
        serviceTypes: ["foodDelivery"],
        dimensions: ["item"],
      },
    },
    {
      question: "How many times did I order Chicken Kabab?",
      expected: {
        itemQuery: "Chicken Kabab",
        serviceTypes: ["foodDelivery"],
        dimensions: ["item"],
        absentDimensions: ["hour", "order"],
      },
    },
    {
      question: "whats my fav food ?",
      expected: {
        intent: "rank",
        serviceTypes: ["foodDelivery"],
        dimensions: ["item"],
        absentDimensions: ["merchant"],
      },
    },
    {
      question: "What is my most expensive Swiggy order?",
      expected: {
        intent: "extreme",
        merchantIds: ["swiggy"],
        limit: 1,
        dimensions: ["order"],
        absentDimensions: ["month"],
      },
    },
    {
      question: "What was my biggest dining bill?",
      expected: {
        intent: "extreme",
        limit: 1,
        serviceTypes: ["dineout"],
        dimensions: ["order"],
      },
    },
    {
      question: "What was my biggest Dineout bill?",
      expected: {
        intent: "extreme",
        limit: 1,
        serviceTypes: ["dineout"],
        dimensions: ["order"],
      },
    },
    {
      question: "Average order value last month",
      expected: {
        serviceTypes: [],
        itemQuery: null,
        metrics: ["averageOrderValue"],
        dateRange: april2026("last month"),
      },
    },
    {
      question: "How much delivery fee did I pay last month?",
      expected: {
        dimensions: ["fee"],
        metrics: ["deliveryFee"],
        dateRange: april2026("last month"),
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
        dateRange: april2026("last month"),
      },
    },
    {
      question: "Weekend vs weekday spend last month",
      expected: {
        intent: "compare",
        dimensions: ["dayOfWeek"],
        dateRange: april2026("last month"),
      },
    },
    {
      question: "Which day do I usually order on Swiggy?",
      expected: {
        merchantIds: ["swiggy"],
        dimensions: ["dayOfWeek", "hour"],
      },
    },
    {
      question: "When do I usually order on Swiggy?",
      expected: {
        merchantIds: ["swiggy"],
        dimensions: ["dayOfWeek", "hour"],
      },
    },
    {
      question: "Show spending trends for my last 10 orders",
      expected: {
        intent: "trend",
        includeOrders: true,
        limit: 10,
        serviceTypes: [],
        dimensions: ["month", "order"],
      },
    },
    {
      question: "Monthly Swiggy trend this year",
      expected: {
        intent: "trend",
        merchantIds: ["swiggy"],
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
        merchantIds: ["swiggy"],
        dimensions: ["order"],
        dateRange: {
          label: "today",
          startDate: "2026-05-25",
          endDate: "2026-05-25",
        },
      },
    },
    {
      question: "Merchant Alpha spend this month",
      expected: {
        merchantIds: ["merchant-alpha"],
        dateRange: {
          label: "this month",
          startDate: "2026-05-01",
          endDate: "2026-05-25",
        },
      },
    },
    {
      question: "Show Merchant Alpha orders from April 2026",
      expected: {
        intent: "details",
        includeOrders: true,
        merchantIds: ["merchant-alpha"],
        dimensions: ["order"],
        dateRange: april2026(),
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
        merchantIds: ["swiggy"],
        serviceTypes: ["foodDelivery"],
        itemQuery: null,
        limit: 13,
        dimensions: ["order"],
        absentDimensions: ["item"],
        dateRange: april2026(),
      },
    },
    {
      question: "show those orders",
      conversationText: aprilFoodDeliveryConversation,
      expected: {
        intent: "details",
        includeOrders: true,
        merchantIds: ["swiggy"],
        serviceTypes: ["foodDelivery"],
        limit: 13,
        dimensions: ["order"],
        dateRange: april2026(),
      },
    },
    {
      question: "list them",
      conversationText: broadAprilConversation,
      expected: {
        intent: "details",
        includeOrders: true,
        merchantIds: ["swiggy"],
        serviceTypes: [],
        limit: 16,
        dimensions: ["order"],
        dateRange: april2026(),
      },
    },
    {
      question: "what about grocery?",
      conversationText: broadAprilConversation,
      expected: {
        merchantIds: ["swiggy"],
        serviceTypes: ["grocery"],
        includeOrders: false,
        dateRange: april2026(),
      },
    },
    {
      question: "and dining?",
      conversationText: broadAprilConversation,
      expected: {
        merchantIds: ["swiggy"],
        serviceTypes: ["dineout"],
        dateRange: april2026(),
      },
    },
    {
      question: "food delivery only",
      conversationText: broadAprilConversation,
      expected: {
        merchantIds: ["swiggy"],
        serviceTypes: ["foodDelivery"],
        dateRange: april2026(),
      },
    },
    {
      question: "which restaurants?",
      conversationText: broadAprilConversation,
      expected: {
        merchantIds: ["swiggy"],
        dimensions: ["merchant"],
        dateRange: april2026(),
      },
    },
    {
      question: "top items?",
      conversationText: aprilFoodDeliveryConversation,
      expected: {
        intent: "rank",
        merchantIds: ["swiggy"],
        serviceTypes: ["foodDelivery"],
        dimensions: ["item"],
        dateRange: april2026(),
      },
    },
    {
      question: "break it down by payment",
      conversationText: broadAprilConversation,
      expected: {
        merchantIds: ["swiggy"],
        dimensions: ["paymentMethod"],
        dateRange: april2026(),
      },
    },
    {
      question: "what was the average?",
      conversationText: broadAprilConversation,
      expected: {
        merchantIds: ["swiggy"],
        metrics: ["averageOrderValue"],
        dateRange: april2026(),
      },
    },
    {
      question: "same for last month?",
      conversationText: mayDiningConversation,
      expected: {
        serviceTypes: ["dineout"],
        dateRange: april2026("last month"),
      },
    },
    {
      question: "what about March?",
      conversationText: broadAprilConversation,
      expected: {
        merchantIds: ["swiggy"],
        serviceTypes: [],
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

  it("does not inherit service categories for cross-range merchant trends", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "Which month had my highest Swiggy spend?",
      conversationText:
        "assistant: Food delivery: 5 orders, Rs 2,754\nGrocery: 1 order, Rs 226",
      now,
    });

    expect(plan?.intent).toBe("extreme");
    expect(plan?.merchantIds).toEqual(["swiggy"]);
    expect(plan?.dimensions).toContain("month");
    expect(plan?.serviceTypes).toEqual([]);
  });

  it("does not turn average order value into an item filter", () => {
    const plan = buildDeterministicQueryPlan({
      userText: "average order value for Merchant Alpha last month",
      now,
    });

    expect(plan?.metrics).toContain("averageOrderValue");
    expect(plan?.itemQuery).toBeNull();
    expect(plan?.dimensions).not.toContain("item");
  });
});

describe("buildAssistantFinanceContext", () => {
  it("fetches the full prior service-specific order list for terse follow-ups", async () => {
    getAssistantFinanceSnapshotMock.mockResolvedValueOnce(mockSnapshot());

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

    expect(getAssistantFinanceSnapshotMock).toHaveBeenCalledWith(
      "local",
      expect.objectContaining({
        merchantIds: ["swiggy"],
        serviceTypes: ["foodDelivery"],
        startDate: new Date(2026, 3, 1, 0, 0, 0, 0),
        endDate: new Date(2026, 3, 30, 23, 59, 59, 999),
        includeOrders: true,
        recentOrderLimit: 13,
        recentOnly: false,
        topLimit: 10,
        merchantQuery: undefined,
        itemQuery: undefined,
        dimensions: expect.arrayContaining(["order"]),
        metrics: expect.arrayContaining(["spend", "count"]),
        limit: 13,
      }),
    );
    expect(context?.system).toContain("Order details in range:");
    expect(context?.system).toContain("2026-04-30 #236437869304157");
  });
});

function april2026(label = "April 2026") {
  return {
    label,
    startDate: "2026-04-01",
    endDate: "2026-04-30",
  };
}

function mockSnapshot(): AssistantFinanceSnapshot {
  return {
    dataRange: {
      startDate: "2025-05-02",
      endDate: "2026-05-23",
      transactionCount: 135,
    },
    totals: {
      spend: 6337,
      count: 13,
      averageOrderValue: 487.46,
    },
    serviceBreakdown: [
      {
        serviceType: "foodDelivery",
        label: "Food delivery",
        spend: 6337,
        count: 13,
      },
    ],
    merchantBreakdown: [],
    itemBreakdown: [],
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
        transactionId: "tx-1",
        orderId: "236437869304157",
        merchantId: "swiggy",
        merchantName: "KFC",
        serviceType: "foodDelivery",
        serviceLabel: "Food delivery",
        amount: 510,
        description: null,
        paymentMethod: "Swiggy Money",
        items: [],
      },
    ],
    dataQualityNotes: [],
  };
}
