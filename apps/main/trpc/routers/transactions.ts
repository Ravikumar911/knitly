import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure, protectedProcedure, createTRPCRouter } from "../init";
import { 
  getTransactionsWithEmails, 
  getTransactionsCount, 
  getUserMerchants,
  getTransactionWithEmail,
  type TransactionFilters 
} from "@workspace/database";

const transactionFiltersSchema = z.object({
  merchantId: z.string().optional(),
  merchantName: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  searchQuery: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'merchant']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const transactionsRouter = createTRPCRouter({
  // Get transactions with filtering and pagination
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        filters: transactionFiltersSchema.optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, filters } = input;
      const offset = (page - 1) * pageSize;

      const [transactions, totalCount] = await Promise.all([
        getTransactionsWithEmails(
          ctx.userId!,
          filters as TransactionFilters,
          pageSize,
          offset
        ),
        getTransactionsCount(ctx.userId!, filters as TransactionFilters),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        transactions,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    }),

  // Get a specific transaction with email data
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const transaction = await getTransactionWithEmail(input.id, ctx.userId!);

      if (!transaction) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found",
        });
      }

      return transaction;
    }),

  // Get user's merchants for filter dropdown
  getMerchants: protectedProcedure.query(async ({ ctx }) => {
    const merchants = await getUserMerchants(ctx.userId!);
    return merchants;
  }),

  // Get unique statuses for filter dropdown
  getStatuses: baseProcedure.query(async () => {
    return [
      { value: "COMPLETED", label: "Completed" },
      { value: "PENDING", label: "Pending" },
      { value: "FAILED", label: "Failed" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
  }),

  // Get unique types for filter dropdown
  getTypes: baseProcedure.query(async () => {
    return [
      { value: "DEBIT", label: "Debit" },
      { value: "CREDIT", label: "Credit" },
    ];
  }),
}); 