import { and, count, desc, eq, ne, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "../";
import { transactions } from "../schema/transactions";
import type { Transaction } from "../types";

// Types
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED";
export type TransactionType = "DEBIT" | "CREDIT" | "TRANSFER" | "REFUND";

export interface GetTransactionsParams {
  page?: number;
  pageSize?: number;
  status?: TransactionStatus | null;
  type?: TransactionType | null;
  category?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  amountMin?: number | null;
  amountMax?: number | null;
  merchantName?: string | null;
  userId: string;
  search?: string | null;
  sortBy?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
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
  type,
  category,
  startDate,
  endDate,
  amountMin,
  amountMax,
  merchantName,
  userId,
  search,
  sortBy = 'transactionDate',
  sortDirection = 'desc',
}: GetTransactionsParams): Promise<TransactionResult> {
  const offset = (page - 1) * pageSize;

  // Build where conditions
  const whereConditions: SQL<unknown>[] = [
    eq(transactions.userId, userId),
    isNull(transactions.duplicateOf), // Always filter out duplicates
  ];

  if (status) {
    whereConditions.push(eq(transactions.status, status));
  }
  
  if (type) {
    whereConditions.push(eq(transactions.type, type));
  }
  
  if (category) {
    whereConditions.push(eq(transactions.category, category));
  }
  
  if (startDate) {
    whereConditions.push(sql`${transactions.transactionDate} >= ${startDate}`);
  }
  
  if (endDate) {
    whereConditions.push(sql`${transactions.transactionDate} <= ${endDate}`);
  }
  
  if (amountMin !== null && amountMin !== undefined) {
    whereConditions.push(sql`${transactions.amount} >= ${amountMin}`);
  }
  
  if (amountMax !== null && amountMax !== undefined) {
    whereConditions.push(sql`${transactions.amount} <= ${amountMax}`);
  }
  
  if (merchantName) {
    whereConditions.push(sql`${transactions.merchantName} ILIKE ${`%${merchantName}%`}`);
  }
  
  if (search) {
    whereConditions.push(
      sql`(${transactions.description} ILIKE ${`%${search}%`} OR 
          ${transactions.merchantName} ILIKE ${`%${search}%`} OR
          ${transactions.notes} ILIKE ${`%${search}%`})`
    );
  }

  // Get total count
  const totalCountResult = await db
    .select({ count: count() })
    .from(transactions)
    .where(and(...whereConditions));

  const totalCount = Number(totalCountResult[0]?.count ?? 0);

  // Build the orderBy clause based on sortBy and sortDirection
  let orderByClause;
  
  // Default sort by transactionDate desc if no sort params provided
  if (!sortBy || sortBy === 'transactionDate') {
    orderByClause = sortDirection === 'asc' 
      ? sql`${transactions.transactionDate} asc` 
      : sql`${transactions.transactionDate} desc`;
  } else if (sortBy === 'amount') {
    orderByClause = sortDirection === 'asc'
      ? sql`${transactions.amount} asc`
      : sql`${transactions.amount} desc`;
  } else if (sortBy === 'type') {
    orderByClause = sortDirection === 'asc'
      ? sql`${transactions.type} asc`
      : sql`${transactions.type} desc`;
  } else if (sortBy === 'status') {
    orderByClause = sortDirection === 'asc'
      ? sql`${transactions.status} asc`
      : sql`${transactions.status} desc`;
  } else if (sortBy === 'category') {
    orderByClause = sortDirection === 'asc'
      ? sql`${transactions.category} asc nulls last`
      : sql`${transactions.category} desc nulls last`;
  } else {
    // Default to transactionDate desc for any unhandled sort field
    orderByClause = sql`${transactions.transactionDate} desc`;
  }

  // Get paginated transactions with sorting
  const results = await db
    .select()
    .from(transactions)
    .where(and(...whereConditions))
    .orderBy(orderByClause)
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
        eq(transactions.status, 'COMPLETED'),
        isNull(transactions.duplicateOf)
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
        isNull(transactions.duplicateOf),
        sql`${transactions.transactionDate} >= ${startDate}`,
        sql`${transactions.transactionDate} <= ${endDate}`
      )
    );

  return result[0]?.totalSpending || 0;
}

export async function getAverageMonthlySpending(userId: string): Promise<number> {
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
            eq(transactions.status, 'COMPLETED'),
            isNull(transactions.duplicateOf)
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${transactions.transactionDate})`)
    );

  const result = await db
    .with(monthlyTotals)
    .select({
      averageMonthly: sql<number>`ROUND(AVG(monthly_totals.monthly_total)::numeric, 2)`.mapWith(Number)
    })
    .from(monthlyTotals);

  return result[0]?.averageMonthly || 0;
}

export async function getAverageDailySpending(userId: string): Promise<number> {
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
            eq(transactions.status, 'COMPLETED'),
            isNull(transactions.duplicateOf)
          )
        )
        .groupBy(sql`DATE_TRUNC('day', ${transactions.transactionDate})`)
    );

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
        eq(transactions.status, 'COMPLETED'),
        isNull(transactions.duplicateOf)
      )
    )
    .groupBy(sql`EXTRACT(DOW FROM ${transactions.transactionDate}), to_char(${transactions.transactionDate}, 'Day')`)
    .orderBy(sql`day_of_week`);

  return result.map(row => ({
    dayOfWeek: row.dayOfWeek === 0 ? 7 : row.dayOfWeek,
    dayName: row.dayName.trim(),
    totalSpending: row.totalSpending || 0
  }));
} 