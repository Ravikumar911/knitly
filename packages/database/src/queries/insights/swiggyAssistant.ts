import { and, asc, eq } from "drizzle-orm";
import { db } from "../../client";
import { transactionsV2 } from "../../schema/transactionsV2";

export type SwiggyAssistantService =
  | "foodDelivery"
  | "instamart"
  | "dineout"
  | "unknown";

export interface SwiggyAssistantSnapshotInput {
  startDate?: Date;
  endDate?: Date;
  recentOrderLimit?: number;
  recentOnly?: boolean;
  topLimit?: number;
  services?: SwiggyAssistantService[];
  merchantQuery?: string;
  itemQuery?: string;
}

export type SwiggyAssistantOrderItem = {
  name: string;
  quantity: number;
  spend: number;
};

export type SwiggyAssistantOrder = {
  date: string;
  orderId: string | null;
  amount: number;
  service: SwiggyAssistantService;
  merchant: string;
  description: string | null;
  paymentMethod: string | null;
  items: SwiggyAssistantOrderItem[];
};

export interface SwiggyAssistantSnapshot {
  dataRange: {
    startDate: string | null;
    endDate: string | null;
    transactionCount: number;
  };
  totals: {
    spend: number;
    orders: number;
    averageOrderValue: number;
  };
  serviceBreakdown: Array<{
    service: SwiggyAssistantService;
    label: string;
    spend: number;
    orders: number;
  }>;
  topRestaurantsByOrders: Array<{
    name: string;
    orders: number;
    spend: number;
    service: SwiggyAssistantService;
  }>;
  topRestaurantsBySpend: Array<{
    name: string;
    orders: number;
    spend: number;
    service: SwiggyAssistantService;
  }>;
  topFoodItems: Array<{
    name: string;
    quantity: number;
    orders: number;
    spend: number;
    restaurants: string[];
  }>;
  topInstamartItems: Array<{
    name: string;
    quantity: number;
    spend: number;
  }>;
  paymentBreakdown: Array<{
    method: string;
    orders: number;
    spend: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    spend: number;
    orders: number;
  }>;
  dayOfWeekBreakdown: Array<{
    day: string;
    orders: number;
    spend: number;
  }>;
  hourBreakdown: Array<{
    hour: number;
    orders: number;
    spend: number;
  }>;
  feeSummary: {
    totalDeliveryFee: number;
    averageDeliveryFee: number;
    totalDiscount: number;
    averageDiscount: number;
  };
  topOrdersBySpend: SwiggyAssistantOrder[];
  recentOrders: SwiggyAssistantOrder[];
  dataQualityNotes: string[];
}

type MerchantData = {
  swiggyMetadata?: {
    service?: string;
  };
  transaction?: {
    orderId?: string;
    restaurantName?: string;
    merchantName?: string;
    deliveryFee?: number;
    discount?: number;
    membershipDiscount?: number;
    orderItems?: Array<{
      name?: string;
      quantity?: number;
      price?: number;
      customizations?: unknown[];
    }>;
  };
};

type SwiggyAssistantRow = {
  amount: number;
  transactionDate: Date;
  description: string | null;
  paymentMethod: string | null;
  merchantData: MerchantData;
  extractionConfidence: number | null;
};

const serviceLabels: Record<SwiggyAssistantService, string> = {
  foodDelivery: "Food delivery",
  instamart: "Instamart",
  dineout: "Dineout",
  unknown: "Unknown",
};

const serviceOrder: SwiggyAssistantService[] = [
  "foodDelivery",
  "instamart",
  "dineout",
  "unknown",
];

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function getSwiggyAssistantSnapshot(
  userId: string,
  input: SwiggyAssistantSnapshotInput = {},
): Promise<SwiggyAssistantSnapshot> {
  const topLimit = clampLimit(input.topLimit, 5, 10);
  const recentOrderLimit = clampLimit(input.recentOrderLimit, 10, 50);
  const allRows = await getSwiggyRows(userId);
  let scopedRows = allRows.filter((row) => {
    if (input.startDate && row.transactionDate < input.startDate) return false;
    if (input.endDate && row.transactionDate > input.endDate) return false;
    const service = normalizeService(row.merchantData.swiggyMetadata?.service);
    if (input.services?.length && !input.services.includes(service)) {
      return false;
    }
    if (input.merchantQuery) {
      const merchantText = `${restaurantNameForRow(row, service) ?? ""} ${
        row.description ?? ""
      }`.toLowerCase();
      if (!merchantText.includes(input.merchantQuery.toLowerCase())) {
        return false;
      }
    }
    if (input.itemQuery) {
      const itemText = orderItemsForRow(row, service)
        .map((item) => item.name)
        .join(" ")
        .toLowerCase();
      if (!itemText.includes(input.itemQuery.toLowerCase())) {
        return false;
      }
    }
    return true;
  });
  if (input.recentOnly) {
    scopedRows = [...scopedRows]
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
      .slice(0, recentOrderLimit);
  }

  const serviceTotals = new Map<
    SwiggyAssistantService,
    { spend: number; orders: number }
  >();
  const restaurants = new Map<
    string,
    {
      name: string;
      orders: number;
      spend: number;
      service: SwiggyAssistantService;
    }
  >();
  const instamartItems = new Map<
    string,
    { name: string; quantity: number; spend: number }
  >();
  const foodItems = new Map<
    string,
    {
      name: string;
      quantity: number;
      orders: number;
      spend: number;
      restaurants: Set<string>;
    }
  >();
  const paymentMethods = new Map<
    string,
    { method: string; orders: number; spend: number }
  >();
  const monthly = new Map<
    string,
    { month: string; spend: number; orders: number }
  >();
  const days = new Map<
    string,
    { day: string; orders: number; spend: number }
  >();
  const hours = new Map<
    number,
    { hour: number; orders: number; spend: number }
  >();
  const dataQualityNotes = new Set<string>();
  let deliveryFeeTotal = 0;
  let deliveryFeeCount = 0;
  let discountTotal = 0;
  let discountCount = 0;

  for (const row of scopedRows) {
    const service = normalizeService(row.merchantData.swiggyMetadata?.service);
    incrementService(serviceTotals, service, row.amount);
    incrementMonth(monthly, row.transactionDate, row.amount);
    incrementDay(days, row.transactionDate, row.amount);
    incrementHour(hours, row.transactionDate, row.amount);
    incrementPaymentMethod(paymentMethods, row.paymentMethod, row.amount);

    if (service === "instamart") {
      addInstamartItems(
        instamartItems,
        row.merchantData,
        row.amount,
        dataQualityNotes,
      );
    } else {
      const restaurantName = restaurantNameForRow(row, service);
      if (restaurantName) {
        const existing = restaurants.get(restaurantName) ?? {
          name: restaurantName,
          orders: 0,
          spend: 0,
          service,
        };
        existing.orders += 1;
        existing.spend += row.amount;
        restaurants.set(restaurantName, existing);
      }
      if (service === "foodDelivery") {
        addFoodItems(
          foodItems,
          row.merchantData,
          row.amount,
          restaurantName,
          dataQualityNotes,
        );
      }
    }

    if (service === "dineout" && Number(row.extractionConfidence ?? 1) < 0.7) {
      dataQualityNotes.add(
        "Some Dineout rows have low extraction confidence, so restaurant names for Dineout may be incomplete.",
      );
    }

    const deliveryFee = numeric(row.merchantData.transaction?.deliveryFee);
    if (deliveryFee > 0) {
      deliveryFeeTotal += deliveryFee;
      deliveryFeeCount += 1;
    }
    const discount =
      numeric(row.merchantData.transaction?.discount) +
      numeric(row.merchantData.transaction?.membershipDiscount);
    if (discount > 0) {
      discountTotal += discount;
      discountCount += 1;
    }
  }

  const spend = sum(scopedRows.map((row) => row.amount));
  const orders = scopedRows.length;
  const dataRange = rangeForRows(allRows);
  const busiestHour = maxBy([...hours.values()], (item) => item.orders);
  if (orders > 0 && busiestHour && busiestHour.orders / orders > 0.6) {
    dataQualityNotes.add(
      "Many rows share the same hour, so hour-of-day summaries may reflect normalized email timestamps rather than actual order time.",
    );
  }

  return {
    dataRange: {
      startDate: dataRange.startDate,
      endDate: dataRange.endDate,
      transactionCount: allRows.length,
    },
    totals: {
      spend,
      orders,
      averageOrderValue: orders ? spend / orders : 0,
    },
    serviceBreakdown: serviceOrder
      .map((service) => {
        const value = serviceTotals.get(service) ?? { spend: 0, orders: 0 };
        return {
          service,
          label: serviceLabels[service],
          spend: value.spend,
          orders: value.orders,
        };
      })
      .filter((value) => value.orders > 0 || value.spend > 0),
    topRestaurantsByOrders: [...restaurants.values()]
      .sort((a, b) => b.orders - a.orders || b.spend - a.spend)
      .slice(0, topLimit),
    topRestaurantsBySpend: [...restaurants.values()]
      .sort((a, b) => b.spend - a.spend || b.orders - a.orders)
      .slice(0, topLimit),
    topFoodItems: [...foodItems.values()]
      .sort(
        (a, b) =>
          b.orders - a.orders || b.quantity - a.quantity || b.spend - a.spend,
      )
      .slice(0, topLimit)
      .map((item) => ({
        name: item.name,
        quantity: item.quantity,
        orders: item.orders,
        spend: item.spend,
        restaurants: [...item.restaurants].sort(),
      })),
    topInstamartItems: [...instamartItems.values()]
      .sort((a, b) => b.quantity - a.quantity || b.spend - a.spend)
      .slice(0, topLimit),
    paymentBreakdown: [...paymentMethods.values()]
      .sort((a, b) => b.orders - a.orders || b.spend - a.spend)
      .slice(0, topLimit),
    monthlyTrend: [...monthly.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
    dayOfWeekBreakdown: [...days.values()].sort(
      (a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day),
    ),
    hourBreakdown: [...hours.values()].sort((a, b) => a.hour - b.hour),
    feeSummary: {
      totalDeliveryFee: deliveryFeeTotal,
      averageDeliveryFee: deliveryFeeCount
        ? deliveryFeeTotal / deliveryFeeCount
        : 0,
      totalDiscount: discountTotal,
      averageDiscount: discountCount ? discountTotal / discountCount : 0,
    },
    topOrdersBySpend: [...scopedRows]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, topLimit)
      .map((row) => orderDetailForRow(row)),
    recentOrders: [...scopedRows]
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
      .slice(0, recentOrderLimit)
      .map((row) => orderDetailForRow(row)),
    dataQualityNotes: [...dataQualityNotes],
  };
}

async function getSwiggyRows(userId: string): Promise<SwiggyAssistantRow[]> {
  const rows = await db
    .select({
      amount: transactionsV2.amount,
      transactionDate: transactionsV2.transactionDate,
      description: transactionsV2.description,
      paymentMethod: transactionsV2.paymentMethod,
      merchantData: transactionsV2.merchantData,
      extractionConfidence: transactionsV2.extractionConfidence,
    })
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.userId, userId),
        eq(transactionsV2.merchantId, "swiggy"),
        eq(transactionsV2.type, "DEBIT"),
        eq(transactionsV2.status, "COMPLETED"),
      ),
    )
    .orderBy(asc(transactionsV2.transactionDate));

  return rows.map((row) => ({
    amount: numeric(row.amount),
    transactionDate: row.transactionDate,
    description: row.description,
    paymentMethod: row.paymentMethod,
    merchantData: asMerchantData(row.merchantData),
    extractionConfidence: row.extractionConfidence,
  }));
}

function orderDetailForRow(row: SwiggyAssistantRow): SwiggyAssistantOrder {
  const service = normalizeService(row.merchantData.swiggyMetadata?.service);
  return {
    date: formatDate(row.transactionDate),
    orderId: cleanName(row.merchantData.transaction?.orderId),
    amount: row.amount,
    service,
    merchant:
      service === "instamart"
        ? "Instamart"
        : restaurantNameForRow(row, service) || "Unknown restaurant",
    description: row.description,
    paymentMethod: cleanPaymentMethod(row.paymentMethod),
    items: orderItemsForRow(row, service),
  };
}

function orderItemsForRow(
  row: SwiggyAssistantRow,
  service: SwiggyAssistantService,
): SwiggyAssistantOrderItem[] {
  const orderItems = Array.isArray(row.merchantData.transaction?.orderItems)
    ? row.merchantData.transaction.orderItems
    : [];
  return orderItems.flatMap((item) => {
    const name = cleanName(item.name);
    if (!name) return [];
    const quantity = numeric(item.quantity ?? 1) || 1;
    const unitPrice = numeric(item.price);
    const looksValid =
      service === "instamart"
        ? looksLikeInstamartItem(name, quantity, unitPrice, row.amount)
        : looksLikeFoodItem(name, quantity, unitPrice, row.amount);
    if (!looksValid) return [];
    return [
      {
        name,
        quantity,
        spend: unitPrice * quantity,
      },
    ];
  });
}

function incrementService(
  totals: Map<SwiggyAssistantService, { spend: number; orders: number }>,
  service: SwiggyAssistantService,
  amount: number,
) {
  const existing = totals.get(service) ?? { spend: 0, orders: 0 };
  existing.spend += amount;
  existing.orders += 1;
  totals.set(service, existing);
}

function incrementMonth(
  totals: Map<string, { month: string; spend: number; orders: number }>,
  date: Date,
  amount: number,
) {
  const month = formatMonth(date);
  const existing = totals.get(month) ?? { month, spend: 0, orders: 0 };
  existing.spend += amount;
  existing.orders += 1;
  totals.set(month, existing);
}

function incrementDay(
  totals: Map<string, { day: string; orders: number; spend: number }>,
  date: Date,
  amount: number,
) {
  const day = dayNames[date.getDay()] ?? "Unknown";
  const existing = totals.get(day) ?? { day, spend: 0, orders: 0 };
  existing.spend += amount;
  existing.orders += 1;
  totals.set(day, existing);
}

function incrementHour(
  totals: Map<number, { hour: number; orders: number; spend: number }>,
  date: Date,
  amount: number,
) {
  const hour = date.getHours();
  const existing = totals.get(hour) ?? { hour, spend: 0, orders: 0 };
  existing.spend += amount;
  existing.orders += 1;
  totals.set(hour, existing);
}

function incrementPaymentMethod(
  totals: Map<string, { method: string; orders: number; spend: number }>,
  paymentMethod: string | null,
  amount: number,
) {
  const method = cleanPaymentMethod(paymentMethod) ?? "Unknown";
  const existing = totals.get(method) ?? { method, spend: 0, orders: 0 };
  existing.spend += amount;
  existing.orders += 1;
  totals.set(method, existing);
}

function addInstamartItems(
  items: Map<string, { name: string; quantity: number; spend: number }>,
  merchantData: MerchantData,
  orderAmount: number,
  dataQualityNotes: Set<string>,
) {
  const orderItems = Array.isArray(merchantData.transaction?.orderItems)
    ? merchantData.transaction.orderItems
    : [];
  for (const item of orderItems) {
    const name = cleanName(item.name);
    if (!name) continue;
    const quantity = numeric(item.quantity ?? 1) || 1;
    const unitPrice = numeric(item.price);
    if (!looksLikeInstamartItem(name, quantity, unitPrice, orderAmount)) {
      dataQualityNotes.add(
        "Some Instamart item-level fields looked corrupted and were excluded from item rankings; order totals were still counted.",
      );
      continue;
    }
    const spend = unitPrice * quantity;
    const existing = items.get(name) ?? { name, quantity: 0, spend: 0 };
    existing.quantity += quantity;
    existing.spend += spend;
    items.set(name, existing);
  }
}

function addFoodItems(
  items: Map<
    string,
    {
      name: string;
      quantity: number;
      orders: number;
      spend: number;
      restaurants: Set<string>;
    }
  >,
  merchantData: MerchantData,
  orderAmount: number,
  restaurantName: string | null,
  dataQualityNotes: Set<string>,
) {
  const orderItems = Array.isArray(merchantData.transaction?.orderItems)
    ? merchantData.transaction.orderItems
    : [];
  const countedInOrder = new Set<string>();

  for (const item of orderItems) {
    const name = cleanName(item.name);
    if (!name) continue;
    const quantity = numeric(item.quantity ?? 1) || 1;
    const unitPrice = numeric(item.price);
    if (!looksLikeFoodItem(name, quantity, unitPrice, orderAmount)) {
      if (!looksLikeNonFoodCharge(name)) {
        dataQualityNotes.add(
          "Some food delivery item-level fields looked corrupted and were excluded from menu-item rankings; order totals were still counted.",
        );
      }
      continue;
    }

    const key = name.toLowerCase();
    const existing = items.get(key) ?? {
      name,
      quantity: 0,
      orders: 0,
      spend: 0,
      restaurants: new Set<string>(),
    };
    existing.quantity += quantity;
    existing.spend += unitPrice * quantity;
    if (!countedInOrder.has(key)) {
      existing.orders += 1;
      countedInOrder.add(key);
    }
    if (restaurantName) {
      existing.restaurants.add(restaurantName);
    }
    items.set(key, existing);
  }
}

function restaurantNameForRow(
  row: SwiggyAssistantRow,
  service: SwiggyAssistantService,
) {
  const direct = cleanName(
    row.merchantData.transaction?.restaurantName ||
      row.merchantData.transaction?.merchantName,
  );
  if (direct && looksLikeMerchantName(direct)) return direct;

  if (service !== "foodDelivery") return null;

  const fromDescription = cleanName(
    row.description?.replace(/^Swiggy order\s*-\s*/i, ""),
  );
  return fromDescription && looksLikeMerchantName(fromDescription)
    ? fromDescription
    : null;
}

function looksLikeMerchantName(value: string) {
  if (value.length > 80) return false;
  return !/^discount\b|^total paid\b|^one offer\b|^swiggy$/i.test(value);
}

function looksLikeInstamartItem(
  name: string,
  quantity: number,
  unitPrice: number,
  orderAmount: number,
) {
  if (/^\d+$/.test(name)) return false;
  if (name.length > 140) return false;
  if (quantity <= 0 || quantity > 50) return false;
  if (unitPrice <= 0 || unitPrice > 100_000) return false;
  if (unitPrice * quantity > Math.max(orderAmount * 3, orderAmount + 1_000)) {
    return false;
  }
  return true;
}

function looksLikeFoodItem(
  name: string,
  quantity: number,
  unitPrice: number,
  orderAmount: number,
) {
  if (looksLikeNonFoodCharge(name)) return false;
  if (/^\d+$/.test(name)) return false;
  if (name.length > 160) return false;
  if (quantity <= 0 || quantity > 25) return false;
  if (unitPrice <= 0 || unitPrice > 100_000) return false;
  if (
    unitPrice > 0 &&
    unitPrice * quantity > Math.max(orderAmount * 3, orderAmount + 1_000)
  ) {
    return false;
  }
  return true;
}

function looksLikeNonFoodCharge(name: string) {
  return /\b(packing|packaging|platform|delivery|handling|convenience|surge|rain|tip|tax|charges?|fees?|discount|coupon)\b/i.test(
    name,
  );
}

function normalizeService(value: string | undefined): SwiggyAssistantService {
  switch (value) {
    case "FOOD_DELIVERY":
      return "foodDelivery";
    case "INSTAMART":
      return "instamart";
    case "DINEOUT":
      return "dineout";
    default:
      return "unknown";
  }
}

function rangeForRows(rows: SwiggyAssistantRow[]) {
  if (rows.length === 0) {
    return { startDate: null, endDate: null };
  }

  return {
    startDate: formatDate(rows[0]!.transactionDate),
    endDate: formatDate(rows[rows.length - 1]!.transactionDate),
  };
}

function asMerchantData(value: unknown): MerchantData {
  return (value && typeof value === "object" ? value : {}) as MerchantData;
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = decodeBasicEntities(value).replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function decodeBasicEntities(value: string) {
  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    decoded = decoded
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  return decoded;
}

function cleanPaymentMethod(value: string | null) {
  if (!value) return null;
  return value.replace(/:+$/g, "").trim() || null;
}

function numeric(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function maxBy<T>(items: T[], score: (item: T) => number) {
  return items.reduce<T | null>((best, item) => {
    if (!best || score(item) > score(best)) return item;
    return best;
  }, null);
}

function clampLimit(value: number | undefined, fallback: number, max: number) {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.floor(value), max));
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
