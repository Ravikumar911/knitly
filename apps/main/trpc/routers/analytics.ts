import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getSwiggySpendingOverview,
  getSwiggyBehaviorInsights,
  getSwiggySmartInsights,
} from "@workspace/database";

// Input validation schema for date range queries
const DateRangeSchema = z.object({
  startDate: z.string().datetime().transform((str) => new Date(str)),
  endDate: z.string().datetime().transform((str) => new Date(str)),
});

// Default date range helper (last 30 days)
const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return { startDate, endDate };
};

// Router for Swiggy analytics operations
export const analyticsRouter = createTRPCRouter({
  // Get comprehensive Swiggy spending overview
  swiggy: createTRPCRouter({
    // Core spending metrics: total spend, order count, avg order value, service breakdown, top restaurants
    overview: protectedProcedure
      .input(DateRangeSchema.optional())
      .query(async ({ ctx, input }) => {
        try {
          const { startDate, endDate } = input || getDefaultDateRange();
          
          const overview = await getSwiggySpendingOverview(
            ctx.userId!,
            startDate,
            endDate
          );
          
          return {
            success: true,
            data: overview,
            dateRange: { startDate, endDate },
          };
        } catch (error) {
          console.error("Error getting Swiggy spending overview:", error);
          
          if (error instanceof TRPCError) {
            throw error;
          }
          
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Unknown error getting spending overview",
          });
        }
      }),

    // Behavioral insights: weekend vs weekday, expensive days, trends, delivery fees, savings
    behavior: protectedProcedure
      .input(DateRangeSchema.optional())
      .query(async ({ ctx, input }) => {
        try {
          const { startDate, endDate } = input || getDefaultDateRange();
          
          const insights = await getSwiggyBehaviorInsights(
            ctx.userId!,
            startDate,
            endDate
          );
          
          return {
            success: true,
            data: insights,
            dateRange: { startDate, endDate },
          };
        } catch (error) {
          console.error("Error getting Swiggy behavior insights:", error);
          
          if (error instanceof TRPCError) {
            throw error;
          }
          
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Unknown error getting behavior insights",
          });
        }
      }),

    // Smart insights: cost per meal, MoM change, peak hours, expensive orders, top areas
    insights: protectedProcedure
      .input(DateRangeSchema.optional())
      .query(async ({ ctx, input }) => {
        try {
          const { startDate, endDate } = input || getDefaultDateRange();
          
          const smartInsights = await getSwiggySmartInsights(
            ctx.userId!,
            startDate,
            endDate
          );
          
          return {
            success: true,
            data: smartInsights,
            dateRange: { startDate, endDate },
          };
        } catch (error) {
          console.error("Error getting Swiggy smart insights:", error);
          
          if (error instanceof TRPCError) {
            throw error;
          }
          
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Unknown error getting smart insights",
          });
        }
      }),

    // Combined dashboard data - all insights in one call for dashboard efficiency
    dashboard: protectedProcedure
      .input(DateRangeSchema.optional())
      .query(async ({ ctx, input }) => {
        try {
          const { startDate, endDate } = input || getDefaultDateRange();
          const userId = ctx.userId!;
          
          // Fetch all analytics data in parallel for better performance
          const [overview, behavior, insights] = await Promise.all([
            getSwiggySpendingOverview(userId, startDate, endDate),
            getSwiggyBehaviorInsights(userId, startDate, endDate),
            getSwiggySmartInsights(userId, startDate, endDate),
          ]);
          
          return {
            success: true,
            data: {
              overview,
              behavior,
              insights,
            },
            dateRange: { startDate, endDate },
          };
        } catch (error) {
          console.error("Error getting Swiggy dashboard data:", error);
          
          if (error instanceof TRPCError) {
            throw error;
          }
          
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Unknown error getting dashboard data",
          });
        }
      }),
  }),
}); 