import { tool } from "ai";
import { z } from "zod";
import {
  getSwiggyBehaviorInsights,
  getSwiggySmartInsights,
  getSwiggySpendingOverview,
  LOCAL_USER_ID,
} from "@workspace/database";

const dateRangeSchema = z.object({
  startDate: z.string().optional().describe("Start date in YYYY-MM-DD format. Defaults to 90 days ago."),
  endDate: z.string().optional().describe("End date in YYYY-MM-DD format. Defaults to today."),
});

export const swiggySpendingOverviewTool = tool({
  description: "Get Swiggy spend, order count, average order value, service mix, top restaurants, and top Instamart items.",
  inputSchema: dateRangeSchema,
  execute: async ({ startDate, endDate }) => {
    const range = parseDateRange(startDate, endDate);
    return {
      range: { startDate: range.startDate, endDate: range.endDate },
      overview: await getSwiggySpendingOverview(LOCAL_USER_ID, range.start, range.end),
    };
  },
});

export const swiggyBehaviorInsightsTool = tool({
  description: "Get Swiggy behavior patterns including weekend versus weekday spend, monthly trend, delivery fees, savings, and day-wise spending.",
  inputSchema: dateRangeSchema,
  execute: async ({ startDate, endDate }) => {
    const range = parseDateRange(startDate, endDate);
    return {
      range: { startDate: range.startDate, endDate: range.endDate },
      insights: await getSwiggyBehaviorInsights(LOCAL_USER_ID, range.start, range.end),
    };
  },
});

export const swiggySmartInsightsTool = tool({
  description: "Get higher-level Swiggy insights including peak ordering hour, most expensive order, and top delivery area.",
  inputSchema: dateRangeSchema,
  execute: async ({ startDate, endDate }) => {
    const range = parseDateRange(startDate, endDate);
    return {
      range: { startDate: range.startDate, endDate: range.endDate },
      insights: await getSwiggySmartInsights(LOCAL_USER_ID, range.start, range.end),
    };
  },
});

export const swiggyAnalyticsTools = {
  swiggySpendingOverview: swiggySpendingOverviewTool,
  swiggyBehaviorInsights: swiggyBehaviorInsightsTool,
  swiggySmartInsights: swiggySmartInsightsTool,
};

function parseDateRange(startDate?: string, endDate?: string) {
  const end = parseDate(endDate) ?? new Date();
  const start = parseDate(startDate) ?? new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
