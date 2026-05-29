import { tool } from "ai";
import { z } from "zod";
import {
  listAssistantOrders,
  getAssistantSpendingSummary,
  getAssistantSpendingTrends,
  getAssistantTopMerchants,
  getAssistantOrderDetail,
  getUserSpendingOverview,
  LOCAL_USER_ID,
  type AssistantToolFilters,
} from "@workspace/database";

/**
 * Shared filter schema for all finance tools.
 *
 * The model decides every parameter. Key precedence rules (make these obvious to the model):
 * - recentOnly=true takes precedence over startDate/endDate.
 * - Each tool decides its own practical default for `limit` in its execute wrapper.
 * - All date strings must be YYYY-MM-DD.
 */
const financeFilterSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe(
      "Inclusive start date in YYYY-MM-DD format. Use for month-specific or custom range questions. Omit for 'recent' or 'last N' queries.",
    ),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe(
      "Inclusive end date in YYYY-MM-DD format. Use together with startDate for ranges.",
    ),
  merchantIds: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Filter to specific normalized merchant/platform ids (e.g. 'swiggy', 'zomato', 'uber-eats', 'instamart').",
    ),
  serviceTypes: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Filter by service category: 'foodDelivery', 'grocery', 'dineout'. Use when the user mentions a specific category.",
    ),
  merchantQuery: z
    .string()
    .optional()
    .describe(
      "Free-text substring search on merchant or restaurant name (case-insensitive). Great for 'orders from McDonalds' or 'any Swiggy Instamart'.",
    ),
  itemQuery: z
    .string()
    .optional()
    .describe(
      "Free-text substring search across line item names inside orders (e.g. 'biryani', 'coffee', 'ice cream').",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe(
      "Maximum number of results to return (1-50). Each tool applies its own default when omitted.",
    ),
  recentOnly: z
    .boolean()
    .optional()
    .describe(
      "When true, returns the most recent completed orders (ignores startDate/endDate). " +
        "Use this for 'last N', 'most recent', or when the user did not specify a date range.",
    ),
});

type FinanceFilters = z.infer<typeof financeFilterSchema>;

/**
 * Stable error shape returned by every finance tool on failure.
 * The model sees a consistent structure regardless of which tool failed.
 */
export type FinanceToolError = {
  error: string;
  message: string;
  dataRange?: { startDate: string | null; endDate: string | null } | null;
  totals?: { spend: number; count: number; averageOrderValue: number } | null;
  merchants?: any[];
  order?: any;
  found?: boolean;
  partial?: boolean;
};

// Helper: convert the Zod-friendly string dates into the Date objects the DB layer expects.
function toDbFilters(input: FinanceFilters): AssistantToolFilters {
  const toDate = (s?: string) => {
    if (!s) return undefined;
    // Interpret YYYY-MM-DD filter strings as UTC midnight so day boundaries are
    // stable regardless of server local TZ. transactionDate values from the DB
    // are timestamp_ms instants; ingestion normalizes them to the day the tx occurred.
    const d = new Date(s + "T00:00:00Z");
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  return {
    startDate: toDate(input.startDate),
    endDate: toDate(input.endDate),
    merchantIds: input.merchantIds,
    serviceTypes: input.serviceTypes,
    merchantQuery: input.merchantQuery,
    itemQuery: input.itemQuery,
    limit: input.limit,
    recentOnly: input.recentOnly,
  };
}

/**
 * Tool 1: List actual orders (with line items, amounts, dates, payment method).
 * The model should call this when the user wants to *see the transactions themselves*.
 */
export const listOrdersTool = tool({
  description:
    "List individual completed debit orders including date, merchant/restaurant name, total amount, service type, payment method, and parsed line items. " +
    "Call this for any request that sounds like 'show my orders', 'last 10 transactions', 'what did I order from X yesterday', or when the user wants the raw list before asking for analysis.",
  inputSchema: financeFilterSchema,
  execute: async (input) => {
    try {
      const result = await listAssistantOrders(
        LOCAL_USER_ID,
        toDbFilters(input),
      );
      return {
        orders: result.orders,
        dataRange: result.dataRange,
        returnedCount: result.orders.length,
        totalMatching: result.count,
      };
    } catch (err) {
      return {
        error: "Failed to list orders",
        message: err instanceof Error ? err.message : String(err),
        dataRange: null,
        totals: null,
        merchants: [],
        order: null,
        found: false,
      } satisfies FinanceToolError;
    }
  },
});

/**
 * Tool 2: Spending summary with breakdowns.
 * Best for "how much did I spend", "break it down by category/platform", "what were my fees".
 */
export const spendingSummaryTool = tool({
  description:
    "Returns totals (total spend, order count, average order value) plus breakdowns by service type, merchant, payment method, and fee/discount summary. " +
    "Use for any question about overall spending, category totals, platform share, or 'how much did delivery fees cost me'. Always call a tool before stating any rupee amounts.",
  inputSchema: financeFilterSchema,
  execute: async (input) => {
    try {
      return await getAssistantSpendingSummary(
        LOCAL_USER_ID,
        toDbFilters(input),
      );
    } catch (err) {
      return {
        error: "Failed to compute spending summary",
        message: err instanceof Error ? err.message : String(err),
        dataRange: null,
        totals: null,
        merchants: [],
        order: null,
        found: false,
      } satisfies FinanceToolError;
    }
  },
});

/**
 * Tool 3: Temporal trends and patterns.
 */
export const spendingTrendsTool = tool({
  description:
    "Returns monthly spending trend plus day-of-week and hour-of-day patterns. " +
    "Call when the user asks about 'trends', 'when do I spend most', 'weekend vs weekday', 'time of day patterns', or compares months.",
  inputSchema: financeFilterSchema,
  execute: async (input) => {
    try {
      return await getAssistantSpendingTrends(
        LOCAL_USER_ID,
        toDbFilters(input),
      );
    } catch (err) {
      return {
        error: "Failed to compute spending trends",
        message: err instanceof Error ? err.message : String(err),
        dataRange: null,
        totals: null,
        merchants: [],
        order: null,
        found: false,
      } satisfies FinanceToolError;
    }
  },
});

/**
 * Tool 4: Top / ranked merchants.
 */
export const topMerchantsTool = tool({
  description:
    "Returns the highest-spend or most frequent merchants (restaurants, grocery stores, etc.) for the given filter. " +
    "Use for 'which places do I order from the most', 'my biggest spending merchants this month', or 'top Swiggy restaurants'.",
  inputSchema: financeFilterSchema,
  execute: async (input) => {
    try {
      return await getAssistantTopMerchants(LOCAL_USER_ID, toDbFilters(input));
    } catch (err) {
      return {
        error: "Failed to rank merchants",
        message: err instanceof Error ? err.message : String(err),
        dataRange: null,
        totals: null,
        merchants: [],
        order: null,
        found: false,
      } satisfies FinanceToolError;
    }
  },
});

/**
 * Tool 5: Drill-down into one specific order (by transaction id).
 * The model discovers transactionIds from listOrdersTool results and can call this for deeper details.
 */
export const orderDetailTool = tool({
  description:
    "Fetch the complete details (including every line item and original extraction data) for one specific transaction using its transactionId. " +
    "Only call this after you have already received a list of orders and the user is asking about a particular one (e.g. 'tell me more about the second order' or 'what items were in the Zomato order from last Tuesday').",
  inputSchema: z.object({
    transactionId: z
      .string()
      .min(1)
      .describe(
        "The transactionId (uuid) of the order to retrieve, taken from a previous listOrdersTool result.",
      ),
  }),
  execute: async ({ transactionId }) => {
    try {
      return await getAssistantOrderDetail(LOCAL_USER_ID, transactionId);
    } catch (err) {
      return {
        error: "Failed to load order detail",
        message: err instanceof Error ? err.message : String(err),
        dataRange: null,
        totals: null,
        merchants: [],
        order: null,
        found: false,
      } satisfies FinanceToolError;
    }
  },
});

/**
 * Tool 6: High-level overview of the user's entire spending history.
 * The model should call this early for most questions, especially anything involving
 * "last month", "recent", comparisons, or when the user asks for advice.
 */
export const spendingOverviewTool = tool({
  description:
    "Returns a compact executive summary of the user's overall spending: date range, total orders/spend, breakdown by food delivery vs grocery vs dineout, top merchants, and monthly activity shape. " +
    "Call this first (or in parallel) for almost any question about trends, comparisons, 'last month', or when giving advice. This gives you the necessary context about the user's actual data distribution.",
  inputSchema: z.object({}), // No parameters needed — it's a global overview
  execute: async () => {
    try {
      return await getUserSpendingOverview(LOCAL_USER_ID);
    } catch (err) {
      return {
        error: "Failed to load spending overview",
        message: err instanceof Error ? err.message : String(err),
        dataRange: null,
        totals: null,
        merchants: [],
        order: null,
        found: false,
      } satisfies FinanceToolError;
    }
  },
});

/**
 * The complete set of finance tools the assistant can call.
 * The model decides which ones to invoke and with what parameters.
 */
export const financeTools = {
  listOrders: listOrdersTool,
  spendingSummary: spendingSummaryTool,
  spendingTrends: spendingTrendsTool,
  topMerchants: topMerchantsTool,
  orderDetail: orderDetailTool,
  spendingOverview: spendingOverviewTool,
} as const;
