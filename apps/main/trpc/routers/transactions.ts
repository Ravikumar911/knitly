import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../init"
import { 
  getTransactions,
  type TransactionStatus, 
  type TransactionType, 
  type DayOfWeekSpending, 
  getTotalSpending, 
  getTotalSpendingByDateRange, 
  getAverageMonthlySpending, 
  getAverageDailySpending, 
  getSpendingByDayOfWeek 
} from "@workspace/database"


const transactionStatusEnum = z.enum([
  "COMPLETED",
  "PENDING",
  "FAILED",
  "REFUNDED",
]) satisfies z.ZodType<TransactionStatus>

const transactionTypeEnum = z.enum([
  "DEBIT",
  "CREDIT",
  "TRANSFER",
  "REFUND",
]) satisfies z.ZodType<TransactionType>

export const transactionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        status: transactionStatusEnum.nullable().default(null),
        type: transactionTypeEnum.nullable().default(null),
        category: z.string().nullable().default(null),
        startDate: z.date().nullable().default(null),
        endDate: z.date().nullable().default(null),
        amountMin: z.number().nullable().default(null),
        amountMax: z.number().nullable().default(null),
        merchantName: z.string().nullable().default(null),
        search: z.string().optional(),
        sortBy: z.string().nullable().default('transactionDate'),
        sortDirection: z.enum(['asc', 'desc']).nullable().default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { transactions, pageCount, totalCount } = await getTransactions({
        ...input,
        userId: ctx.userId!,
      })
      return {
        transactions,
        pageCount,
        totalCount,
      }
    }),

  getTotalSpending: protectedProcedure
    .query(async ({ ctx }) => {
      return getTotalSpending(ctx.userId!);
    }),

  getTotalSpendingByDateRange: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date()
    }))
    .query(async ({ ctx, input }) => {
      return getTotalSpendingByDateRange(ctx.userId!, input.startDate, input.endDate);
    }),

  getAverageMonthlySpending: protectedProcedure
    .query(async ({ ctx }) => {
      return getAverageMonthlySpending(ctx.userId!);
    }),

  getAverageDailySpending: protectedProcedure
    .query(async ({ ctx }) => {
      return getAverageDailySpending(ctx.userId!);
    }),

  getSpendingByDayOfWeek: protectedProcedure
    .query(async ({ ctx }): Promise<DayOfWeekSpending[]> => {
      return getSpendingByDayOfWeek(ctx.userId!);
    })
}) 