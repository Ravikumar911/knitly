import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../";
import { transactionsV2 } from "../../schema/transactionsV2";

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
  topInstamartItems: Array<{
    name: string;
    count: number;
    amount: number;
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

type MerchantData = {
  swiggyMetadata?: {
    service?: string;
  };
  transaction?: {
    orderId?: string;
    restaurantName?: string;
    orderItems?: Array<{
      name?: string;
      quantity?: number;
      price?: number;
    }>;
    deliveryFee?: number;
    discount?: number;
    membershipDiscount?: number;
    deliveryAddress?: {
      area?: string;
      pincode?: string;
    };
  };
};

type SwiggyRow = {
  amount: number;
  transactionDate: Date;
  merchantData: MerchantData;
};

const serviceKeys = {
  FOOD_DELIVERY: "food",
  INSTAMART: "instamart",
  DINEOUT: "dineout",
} as const;

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function asMerchantData(value: unknown): MerchantData {
  return (value && typeof value === "object" ? value : {}) as MerchantData;
}

function serviceBucket(service: string | undefined): keyof SwiggySpendingOverview["serviceBreakdown"] | null {
  return service && service in serviceKeys ? serviceKeys[service as keyof typeof serviceKeys] : null;
}

function amount(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function getSwiggyRows(userId: string, startDate: Date, endDate: Date): Promise<SwiggyRow[]> {
  const rows = await db
    .select({
      amount: transactionsV2.amount,
      transactionDate: transactionsV2.transactionDate,
      merchantData: transactionsV2.merchantData,
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.userId, userId),
        eq(transactionsV2.merchantId, "swiggy"),
        gte(transactionsV2.transactionDate, startDate),
        lte(transactionsV2.transactionDate, endDate),
      ),
    );

  return rows.map((row) => ({
    amount: amount(row.amount),
    transactionDate: row.transactionDate,
    merchantData: asMerchantData(row.merchantData),
  }));
}

export async function getSwiggySpendingOverview(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<SwiggySpendingOverview> {
  const rows = await getSwiggyRows(userId, startDate, endDate);
  const orderRows = rows.filter((row) => row.merchantData.transaction?.orderId);

  const serviceBreakdown = { food: 0, instamart: 0, dineout: 0 };
  const orderBreakdown = { food: 0, instamart: 0, dineout: 0 };
  const restaurants = new Map<string, { name: string; orders: number; spend: number }>();
  const instamartItems = new Map<string, { name: string; count: number; amount: number }>();

  for (const row of orderRows) {
    const bucket = serviceBucket(row.merchantData.swiggyMetadata?.service);
    if (bucket) {
      serviceBreakdown[bucket] += row.amount;
      orderBreakdown[bucket] += 1;
    }

    const restaurant = row.merchantData.transaction?.restaurantName?.trim();
    if (restaurant && bucket !== "instamart") {
      const existing = restaurants.get(restaurant) ?? { name: restaurant, orders: 0, spend: 0 };
      existing.orders += 1;
      existing.spend += row.amount;
      restaurants.set(restaurant, existing);
    }

    if (bucket === "instamart") {
      for (const item of row.merchantData.transaction?.orderItems ?? []) {
        const name = item.name?.trim();
        if (!name) continue;
        const quantity = amount(item.quantity || 1);
        const price = amount(item.price);
        const existing = instamartItems.get(name) ?? { name, count: 0, amount: 0 };
        existing.count += quantity;
        existing.amount += price * quantity;
        instamartItems.set(name, existing);
      }
    }
  }

  const totalSpend = orderRows.reduce((sum, row) => sum + row.amount, 0);
  const orderCount = orderRows.length;

  return {
    totalSpend,
    orderCount,
    avgOrderValue: orderCount ? totalSpend / orderCount : 0,
    serviceBreakdown,
    orderBreakdown,
    topRestaurants: [...restaurants.values()].sort((a, b) => b.spend - a.spend).slice(0, 3),
    topInstamartItems: [...instamartItems.values()].sort((a, b) => b.count - a.count).slice(0, 3),
  };
}

export async function getSwiggyBehaviorInsights(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<SwiggyBehaviorInsights> {
  const rows = (await getSwiggyRows(userId, startDate, endDate)).filter(
    (row) => row.merchantData.transaction?.orderId,
  );

  const weekendVsWeekday = { weekend: 0, weekday: 0 };
  const dayWiseSpending = dayNames.map((day, dayNumber) => ({ day, dayNumber, spend: 0, orders: 0 }));
  const dayTotals = dayNames.map(() => ({ spend: 0, orders: 0 }));
  const monthly = new Map<string, number>();
  let deliveryFeeTotal = 0;
  let deliveryFeeCount = 0;
  let totalSavings = 0;

  for (const row of rows) {
    const date = row.transactionDate;
    const day = date.getDay();
    const period = day === 0 || day === 6 ? "weekend" : "weekday";
    weekendVsWeekday[period] += row.amount;
    dayWiseSpending[day]!.spend += row.amount;
    dayWiseSpending[day]!.orders += 1;
    dayTotals[day]!.spend += row.amount;
    dayTotals[day]!.orders += 1;

    const month = date.toISOString().slice(0, 7);
    monthly.set(month, (monthly.get(month) ?? 0) + row.amount);

    const transaction = row.merchantData.transaction;
    const fee = amount(transaction?.deliveryFee);
    if (fee > 0) {
      deliveryFeeTotal += fee;
      deliveryFeeCount += 1;
    }
    totalSavings += amount(transaction?.discount) + amount(transaction?.membershipDiscount);
  }

  const mostExpensiveDayIndex = dayTotals
    .map((value, index) => ({
      index,
      average: value.orders ? value.spend / value.orders : 0,
    }))
    .sort((a, b) => b.average - a.average)[0]?.index ?? 0;

  return {
    weekendVsWeekday,
    mostExpensiveDay: dayNames[mostExpensiveDayIndex] ?? "Sunday",
    monthlyTrend: [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, spend]) => ({ month, spend })),
    avgDeliveryFee: deliveryFeeCount ? deliveryFeeTotal / deliveryFeeCount : 0,
    totalSavings,
    dayWiseSpending,
  };
}

export async function getSwiggySmartInsights(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<SwiggySmartInsights> {
  const rows = (await getSwiggyRows(userId, startDate, endDate)).filter(
    (row) => row.merchantData.transaction?.orderId,
  );

  const hours = new Map<number, number>();
  const areas = new Map<string, { area: string; pincode: string; orderCount: number }>();
  let mostExpensive = rows[0];

  for (const row of rows) {
    const hour = row.transactionDate.getHours();
    hours.set(hour, (hours.get(hour) ?? 0) + 1);

    if (!mostExpensive || row.amount > mostExpensive.amount) {
      mostExpensive = row;
    }

    const address = row.merchantData.transaction?.deliveryAddress;
    const area = address?.area?.trim();
    if (area) {
      const key = `${area}|${address?.pincode ?? ""}`;
      const existing = areas.get(key) ?? { area, pincode: address?.pincode ?? "", orderCount: 0 };
      existing.orderCount += 1;
      areas.set(key, existing);
    }
  }

  const peakOrderingHour = [...hours.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const topDeliveryArea = [...areas.values()].sort((a, b) => b.orderCount - a.orderCount)[0] ?? {
    area: "",
    pincode: "",
    orderCount: 0,
  };

  return {
    peakOrderingHour,
    mostExpensiveOrder: {
      amount: mostExpensive?.amount ?? 0,
      restaurant: mostExpensive?.merchantData.transaction?.restaurantName ?? "Unknown Restaurant",
      date: mostExpensive?.transactionDate.toISOString().split("T")[0] ?? "",
    },
    topDeliveryArea,
  };
}
