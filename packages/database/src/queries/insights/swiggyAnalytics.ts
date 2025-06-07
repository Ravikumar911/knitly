import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { db } from "../../";
import { transactionsV2 } from "../../schema/transactionsV2";

// Type definitions for return structures
export interface SwiggySpendingOverview {
  totalSpend: number;
  orderCount: number;
  avgOrderValue: number;
  serviceBreakdown: {
    food: number;
    instamart: number;
    dineout: number;
  };
  orderBreakdown: {
    food: number;
    instamart: number;
    dineout: number;
  };
  topRestaurants: Array<{
    name: string;
    orders: number;
    spend: number;
  }>;
}

export interface SwiggyBehaviorInsights {
  weekendVsWeekday: {
    weekend: number;
    weekday: number;
  };
  mostExpensiveDay: string;
  monthlyTrend: Array<{
    month: string;
    spend: number;
  }>;
  avgDeliveryFee: number;
  totalSavings: number;
  dayWiseSpending: Array<{
    day: string;
    dayNumber: number;
    spend: number;
    orders: number;
  }>;
}

export interface SwiggySmartInsights {
  peakOrderingHour: number;
  mostExpensiveOrder: {
    amount: number;
    restaurant: string;
    date: string;
  };
  topDeliveryArea: {
    area: string;
    pincode: string;
    orderCount: number;
  };
}

/**
 * Get core Swiggy spending overview metrics
 * Returns: total spend, order count, avg order value, service breakdown, top 3 restaurants
 */
export async function getSwiggySpendingOverview(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SwiggySpendingOverview> {
  // Main overview query
  const overviewResult = await db
    .select({
      totalSpend: sql<number>`SUM(${transactionsV2.amount}::numeric)`.as('total_spend'),
      orderCount: sql<number>`COUNT(CASE WHEN ${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL THEN 1 END)`.as('order_count'),
      avgOrderValue: sql<number>`AVG(${transactionsV2.amount}::numeric)`.as('avg_order_value'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    );

  // Service breakdown query
  const serviceResult = await db
    .select({
      service: sql<string>`${transactionsV2.merchantData}->'swiggyMetadata'->>'service'`.as('service'),
      orderCount: sql<number>`COUNT(*)`.as('order_count'),
      spend: sql<number>`SUM(${transactionsV2.amount}::numeric)`.as('spend'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    )
    .groupBy(sql`${transactionsV2.merchantData}->'swiggyMetadata'->>'service'`);

  // Top restaurants query
  const restaurantsResult = await db
    .select({
      restaurant: sql<string>`${transactionsV2.merchantData}->'transaction'->>'restaurantName'`.as('restaurant'),
      orders: sql<number>`COUNT(*)`.as('orders'),
      totalSpend: sql<number>`SUM(${transactionsV2.amount}::numeric)`.as('total_spend'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'restaurantName' IS NOT NULL`
      )
    )
    .groupBy(sql`${transactionsV2.merchantData}->'transaction'->>'restaurantName'`)
    .orderBy(sql`SUM(${transactionsV2.amount}::numeric) DESC`)
    .limit(3);

  // Process service breakdown
  const serviceBreakdown = {
    food: 0,
    instamart: 0,
    dineout: 0,
  };

  const orderBreakdown = {
    food: 0,
    instamart: 0,
    dineout: 0,
  };

  serviceResult.forEach((service) => {
    const serviceName = service.service?.toLowerCase();
    if (serviceName === 'food_delivery') {
      serviceBreakdown.food = service.spend || 0;
      orderBreakdown.food = service.orderCount || 0;
    } else if (serviceName === 'instamart') {
      serviceBreakdown.instamart = service.spend || 0;
      orderBreakdown.instamart = service.orderCount || 0;
    } else if (serviceName === 'genie' || serviceName === 'dineout') {
      serviceBreakdown.dineout = service.spend || 0;
      orderBreakdown.dineout = service.orderCount || 0;
    }
  });

  return {
    totalSpend: overviewResult[0]?.totalSpend || 0,
    orderCount: overviewResult[0]?.orderCount || 0,
    avgOrderValue: overviewResult[0]?.avgOrderValue || 0,
    serviceBreakdown,
    orderBreakdown,
    topRestaurants: restaurantsResult.map((r) => ({
      name: r.restaurant || 'Unknown',
      orders: r.orders || 0,
      spend: r.totalSpend || 0,
    })),
  };
}

/**
 * Get Swiggy behavioral insights
 * Returns: weekend vs weekday, most expensive day, monthly trends, delivery fees, savings, day-wise spending
 */
export async function getSwiggyBehaviorInsights(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SwiggyBehaviorInsights> {
  // Weekend vs weekday spending
  const weekendResult = await db
    .select({
      period: sql<string>`CASE WHEN EXTRACT(DOW FROM ${transactionsV2.transactionDate}) IN (0,6) THEN 'weekend' ELSE 'weekday' END`.as('period'),
      orders: sql<number>`COUNT(*)`.as('orders'),
      totalSpend: sql<number>`SUM(${transactionsV2.amount}::numeric)`.as('total_spend'),
      avgSpend: sql<number>`AVG(${transactionsV2.amount}::numeric)`.as('avg_spend'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    )
    .groupBy(sql`CASE WHEN EXTRACT(DOW FROM ${transactionsV2.transactionDate}) IN (0,6) THEN 'weekend' ELSE 'weekday' END`);

  // Day-wise spending breakdown for the selected period
  const dayWiseResult = await db
    .select({
      dayOfWeek: sql<number>`EXTRACT(DOW FROM ${transactionsV2.transactionDate})`.as('day_of_week'),
      totalSpend: sql<number>`SUM(${transactionsV2.amount}::numeric)`.as('total_spend'),
      orderCount: sql<number>`COUNT(*)`.as('order_count'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    )
    .groupBy(sql`EXTRACT(DOW FROM ${transactionsV2.transactionDate})`)
    .orderBy(sql`EXTRACT(DOW FROM ${transactionsV2.transactionDate})`);

  // Most expensive day analysis
  const dayResult = await db
    .select({
      dayOfWeek: sql<number>`EXTRACT(DOW FROM ${transactionsV2.transactionDate})`.as('day_of_week'),
      avgOrderValue: sql<number>`AVG(${transactionsV2.amount}::numeric)`.as('avg_order_value'),
      orderCount: sql<number>`COUNT(*)`.as('order_count'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    )
    .groupBy(sql`EXTRACT(DOW FROM ${transactionsV2.transactionDate})`)
    .orderBy(sql`AVG(${transactionsV2.amount}::numeric) DESC`)
    .limit(1);

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const trendResult = await db
    .select({
      month: sql<string>`DATE_TRUNC('month', ${transactionsV2.transactionDate})`.as('month'),
      monthlySpend: sql<number>`SUM(${transactionsV2.amount}::numeric)`.as('monthly_spend'),
      orderCount: sql<number>`COUNT(*)`.as('order_count'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, sixMonthsAgo),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    )
    .groupBy(sql`DATE_TRUNC('month', ${transactionsV2.transactionDate})`)
    .orderBy(sql`DATE_TRUNC('month', ${transactionsV2.transactionDate})`);

  // Delivery fees and discounts
  const savingsResult = await db
    .select({
      avgDeliveryFee: sql<number>`AVG((${transactionsV2.merchantData}->'transaction'->>'deliveryFee')::numeric)`.as('avg_delivery_fee'),
      totalDiscounts: sql<number>`SUM((${transactionsV2.merchantData}->'transaction'->>'discount')::numeric)`.as('total_discounts'),
      membershipSavings: sql<number>`SUM((${transactionsV2.merchantData}->'transaction'->>'membershipDiscount')::numeric)`.as('membership_savings'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    );

  // Process results
  const weekendVsWeekday = {
    weekend: 0,
    weekday: 0,
  };

  weekendResult.forEach((period) => {
    if (period.period === 'weekend') {
      weekendVsWeekday.weekend = period.totalSpend || 0;
    } else {
      weekendVsWeekday.weekday = period.totalSpend || 0;
    }
  });

  // Process day-wise spending
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayWiseSpending = dayNames.map((dayName, index) => {
    const dayData = dayWiseResult.find(d => Number(d.dayOfWeek) === index);
    return {
      day: dayName,
      dayNumber: index,
      spend: Number(dayData?.totalSpend) || 0,
      orders: Number(dayData?.orderCount) || 0,
    };
  });

  const mostExpensiveDay = dayNames[dayResult[0]?.dayOfWeek || 0] || 'Monday';

  return {
    weekendVsWeekday,
    mostExpensiveDay,
    monthlyTrend: trendResult.map((t) => ({
      month: new Date(t.month).toISOString().substring(0, 7), // YYYY-MM format
      spend: t.monthlySpend || 0,
    })),
    avgDeliveryFee: savingsResult[0]?.avgDeliveryFee || 0,
    totalSavings: (savingsResult[0]?.totalDiscounts || 0) + (savingsResult[0]?.membershipSavings || 0),
    dayWiseSpending,
  };
}

/**
 * Get Swiggy smart insights
 * Returns: peak hours, most expensive order, top delivery area (removed cost per meal and month-over-month)
 */
export async function getSwiggySmartInsights(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SwiggySmartInsights> {
  // Peak ordering hours
  const hoursResult = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${transactionsV2.transactionDate})`.as('hour'),
      orderCount: sql<number>`COUNT(*)`.as('order_count'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    )
    .groupBy(sql`EXTRACT(HOUR FROM ${transactionsV2.transactionDate})`)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(1);

  // Most expensive order - fixed to ensure we get proper restaurant names
  const expensiveResult = await db
    .select({
      maxOrderAmount: sql<number>`${transactionsV2.amount}::numeric`.as('max_order_amount'),
      restaurant: sql<string>`COALESCE(${transactionsV2.merchantData}->'transaction'->>'restaurantName', ${transactionsV2.merchantData}->'transaction'->>'merchantName', 'Unknown Restaurant')`.as('restaurant'),
      transactionDate: transactionsV2.transactionDate,
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`
      )
    )
    .orderBy(sql`${transactionsV2.amount}::numeric DESC`)
    .limit(1);

  // Top delivery areas
  const areaResult = await db
    .select({
      area: sql<string>`${transactionsV2.merchantData}->'transaction'->'deliveryAddress'->>'area'`.as('area'),
      pincode: sql<string>`${transactionsV2.merchantData}->'transaction'->'deliveryAddress'->>'pincode'`.as('pincode'),
      orderCount: sql<number>`COUNT(*)`.as('order_count'),
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.merchantId, 'swiggy'),
        eq(transactionsV2.userId, userId),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
        sql`${transactionsV2.merchantData}->'transaction'->>'orderId' IS NOT NULL`,
        sql`${transactionsV2.merchantData}->'transaction'->'deliveryAddress'->>'area' IS NOT NULL`
      )
    )
    .groupBy(
      sql`${transactionsV2.merchantData}->'transaction'->'deliveryAddress'->>'area'`,
      sql`${transactionsV2.merchantData}->'transaction'->'deliveryAddress'->>'pincode'`
    )
    .orderBy(sql`COUNT(*) DESC`)
    .limit(1);

  return {
    peakOrderingHour: hoursResult[0]?.hour || 12,
    mostExpensiveOrder: {
      amount: expensiveResult[0]?.maxOrderAmount || 0,
      restaurant: expensiveResult[0]?.restaurant || 'Unknown Restaurant',
      date: expensiveResult[0]?.transactionDate?.toISOString().split('T')[0] || '',
    },
    topDeliveryArea: {
      area: areaResult[0]?.area || 'Unknown',
      pincode: areaResult[0]?.pincode || 'Unknown',
      orderCount: areaResult[0]?.orderCount || 0,
    },
  };
} 