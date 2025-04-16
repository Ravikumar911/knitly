import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../";
import { transactions } from "../schema/transactions";
import type { Transaction } from "../types";

// Types
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED" | "DUPLICATE";
export type TransactionType = "DEBIT" | "CREDIT" | "TRANSFER" | "REFUND";

export interface GetTransactionsParams {
  page?: number;
  pageSize?: number;
  status?: TransactionStatus | null;
  search?: string;
  userId: string;
}

export interface TransactionResult {
  transactions: Transaction[];
  pageCount: number;
  totalCount: number;
}

export interface DayOfWeekSpending {
  dayOfWeek: number;  // 1 (Monday) to 7 (Sunday)
  dayName: string;
  totalSpending: number;
}

// Queries
export async function getTransactions({
  page = 1,
  pageSize = 10,
  status,
  search,
  userId,
}: GetTransactionsParams): Promise<TransactionResult> {
  const offset = (page - 1) * pageSize;

  // Build where conditions
  const whereConditions: SQL<unknown>[] = [eq(transactions.userId, userId)];

  if (status) {
    whereConditions.push(eq(transactions.status, status));
  }

  // Get total count
  const totalCountResult = await db
    .select({ count: count() })
    .from(transactions)
    .where(and(...whereConditions));

  const totalCount = Number(totalCountResult[0]?.count ?? 0);

  // Get paginated transactions
  const results = await db
    .select()
    .from(transactions)
    .where(and(...whereConditions))
    .orderBy(desc(transactions.transactionDate))
    .limit(pageSize)
    .offset(offset);

  return {
    transactions: results,
    pageCount: Math.ceil(totalCount / pageSize),
    totalCount,
  };
}

export async function getTotalSpending(userId: string): Promise<number> {
  const result = await db
    .select({
      totalSpending: sql<number>`sum(case when ${transactions.type} = 'DEBIT' then ${transactions.amount} else 0 end)`.mapWith(Number)
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, 'COMPLETED')
      )
    );

  return result[0]?.totalSpending || 0;
}

export async function getTotalSpendingByDateRange(
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<number> {
  const result = await db
    .select({
      totalSpending: sql<number>`sum(case when ${transactions.type} = 'DEBIT' then ${transactions.amount} else 0 end)`.mapWith(Number)
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, 'COMPLETED'),
        sql`${transactions.transactionDate} >= ${startDate}`,
        sql`${transactions.transactionDate} <= ${endDate}`
      )
    );

  return result[0]?.totalSpending || 0;
}

export async function getAverageMonthlySpending(userId: string): Promise<number> {
  // First get monthly totals using a subquery
  const monthlyTotals = db
    .$with('monthly_totals').as(
      db
        .select({
          month: sql`DATE_TRUNC('month', ${transactions.transactionDate})`.as('month'),
          monthlyTotal: sql`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`.as('monthly_total')
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.status, 'COMPLETED')
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${transactions.transactionDate})`)
    );

  // Then calculate the average from monthly totals
  const result = await db
    .with(monthlyTotals)
    .select({
      averageMonthly: sql<number>`ROUND(AVG(monthly_totals.monthly_total)::numeric, 2)`.mapWith(Number)
    })
    .from(monthlyTotals);

  return result[0]?.averageMonthly || 0;
}

export async function getAverageDailySpending(userId: string): Promise<number> {
  // First get daily totals using a subquery
  const dailyTotals = db
    .$with('daily_totals').as(
      db
        .select({
          day: sql`DATE_TRUNC('day', ${transactions.transactionDate})`.as('day'),
          dailyTotal: sql`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`.as('daily_total')
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.status, 'COMPLETED')
          )
        )
        .groupBy(sql`DATE_TRUNC('day', ${transactions.transactionDate})`)
    );

  // Then calculate the average from daily totals
  const result = await db
    .with(dailyTotals)
    .select({
      averageDaily: sql<number>`ROUND(AVG(daily_totals.daily_total)::numeric, 2)`.mapWith(Number)
    })
    .from(dailyTotals);

  return result[0]?.averageDaily || 0;
}

export async function getSpendingByDayOfWeek(userId: string): Promise<DayOfWeekSpending[]> {
  const result = await db
    .select({
      dayOfWeek: sql<number>`EXTRACT(DOW FROM ${transactions.transactionDate})::integer`.as('day_of_week'),
      dayName: sql<string>`to_char(${transactions.transactionDate}, 'Day')`.as('day_name'),
      totalSpending: sql<number>`
        ROUND(
          AVG(CASE WHEN ${transactions.type} = 'DEBIT' 
              THEN ${transactions.amount} 
              ELSE 0 
          END)::numeric, 
          2
        )
      `.mapWith(Number).as('total_spending')
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, 'COMPLETED')
      )
    )
    .groupBy(sql`EXTRACT(DOW FROM ${transactions.transactionDate}), to_char(${transactions.transactionDate}, 'Day')`)
    .orderBy(sql`day_of_week`);

  // PostgreSQL's EXTRACT(DOW) returns 0-6 where 0 is Sunday
  // Let's transform it to 1-7 where 1 is Monday to match conventional week display
  return result.map(row => ({
    dayOfWeek: row.dayOfWeek === 0 ? 7 : row.dayOfWeek,
    dayName: row.dayName.trim(), // Remove padding from day name
    totalSpending: row.totalSpending || 0
  }));
} 