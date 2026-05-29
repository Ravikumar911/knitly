import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../client";
import { transactionsV2 } from "../../schema/transactionsV2";

export type AssistantFinanceDimension =
  | "service"
  | "merchant"
  | "month"
  | "paymentMethod"
  | "dayOfWeek"
  | "hour"
  | "item"
  | "fee"
  | "order";

export type AssistantFinanceMetric =
  | "spend"
  | "count"
  | "averageOrderValue"
  | "deliveryFee"
  | "discount";

export interface AssistantFinanceSnapshotInput {
  merchantIds?: string[];
  serviceTypes?: string[];
  startDate?: Date;
  endDate?: Date;
  includeOrders?: boolean;
  recentOrderLimit?: number;
  recentOnly?: boolean;
  topLimit?: number;
  merchantQuery?: string;
  itemQuery?: string;
  dimensions?: AssistantFinanceDimension[];
  metrics?: AssistantFinanceMetric[];
  limit?: number;
}

export type AssistantFinanceOrderItem = {
  name: string;
  quantity: number;
  spend: number;
};

export type AssistantFinanceOrder = {
  date: string;
  transactionId: string;
  orderId: string | null;
  merchantId: string | null;
  merchantName: string;
  serviceType: string;
  serviceLabel: string;
  amount: number;
  description: string | null;
  paymentMethod: string | null;
  items: AssistantFinanceOrderItem[];
};

export interface AssistantFinanceSnapshot {
  dataRange: {
    startDate: string | null;
    endDate: string | null;
    transactionCount: number;
  };
  totals: {
    spend: number;
    count: number;
    averageOrderValue: number;
  };
  serviceBreakdown: Array<{
    serviceType: string;
    label: string;
    count: number;
    spend: number;
  }>;
  merchantBreakdown: Array<{
    merchantId: string | null;
    name: string;
    count: number;
    spend: number;
    serviceType: string;
  }>;
  itemBreakdown: Array<{
    name: string;
    quantity: number;
    count: number;
    spend: number;
    merchants: string[];
  }>;
  paymentBreakdown: Array<{
    method: string;
    count: number;
    spend: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    spend: number;
    count: number;
  }>;
  dayOfWeekBreakdown: Array<{
    day: string;
    count: number;
    spend: number;
  }>;
  hourBreakdown: Array<{
    hour: number;
    count: number;
    spend: number;
  }>;
  feeSummary: {
    totalDeliveryFee: number;
    averageDeliveryFee: number;
    totalDiscount: number;
    averageDiscount: number;
  };
  topOrdersBySpend: AssistantFinanceOrder[];
  recentOrders: AssistantFinanceOrder[];
  dataQualityNotes: string[];
}

type MerchantData = {
  service?: string;
  serviceType?: string;
  transaction?: {
    orderId?: string;
    service?: string;
    serviceType?: string;
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

type AssistantFinanceRow = {
  id: string;
  merchantId: string | null;
  merchantName: string | null;
  amount: number;
  transactionDate: Date;
  description: string | null;
  paymentMethod: string | null;
  merchantData: MerchantData;
  extractionConfidence: number | null;
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const serviceOrder = ["foodDelivery", "grocery", "dineout", "unknown"];

/**
 * Hard cap on full-history (!recentOnly) row fetches.
 * The "call spendingOverview first" contract (enforced by the system prompt) plus broad
 * summary/trend calls would otherwise load the user's entire DEBIT history into JS.
 * 8000 rows is generous for typical long-term personal finance use (~10-15+ years of heavy daily
 * transactions) while remaining safe even on modest hardware / local SQLite.
 */
const FULL_HISTORY_CAP = 8000;

export async function getAssistantFinanceSnapshot(
  userId: string,
  input: AssistantFinanceSnapshotInput = {},
): Promise<AssistantFinanceSnapshot> {
  const topLimit = clampLimit(input.topLimit ?? input.limit, 5, 10);
  const recentOrderLimit = clampLimit(
    input.recentOrderLimit ?? input.limit,
    10,
    50,
  );
  const rowFetchLimit = input.recentOnly
    ? clampLimit((input.recentOrderLimit ?? input.limit ?? 10) * 5, 25, 200)
    : FULL_HISTORY_CAP;
  const allRows = await getAssistantFinanceRows(userId, {
    recentFirst: Boolean(input.recentOnly),
    limit: rowFetchLimit,
  });
  const merchantScopedRows = allRows.filter((row) =>
    merchantIdMatches(row, input.merchantIds),
  );
  const serviceTypes = normalizeServiceTypeFilters(input.serviceTypes);

  let scopedRows = merchantScopedRows.filter((row) => {
    if (input.startDate && row.transactionDate < input.startDate) return false;
    if (input.endDate && row.transactionDate > input.endDate) return false;

    const serviceType = serviceTypeForRow(row);
    if (serviceTypes.length > 0 && !serviceTypes.includes(serviceType)) {
      return false;
    }

    if (input.merchantQuery) {
      const merchantText = `${merchantNameForRow(row)} ${
        row.description ?? ""
      }`.toLowerCase();
      if (!merchantText.includes(input.merchantQuery.toLowerCase())) {
        return false;
      }
    }

    if (input.itemQuery) {
      const itemText = orderItemsForRow(row)
        .map((item) => item.name)
        .join(" ")
        .toLowerCase();
      if (!itemText.includes(input.itemQuery.toLowerCase())) return false;
    }

    return true;
  });

  if (input.recentOnly) {
    scopedRows = [...scopedRows]
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
      .slice(0, recentOrderLimit);
  }

  const serviceTotals = new Map<
    string,
    { serviceType: string; label: string; count: number; spend: number }
  >();
  const merchantTotals = new Map<
    string,
    {
      merchantId: string | null;
      name: string;
      count: number;
      spend: number;
      serviceType: string;
    }
  >();
  const itemTotals = new Map<
    string,
    {
      name: string;
      quantity: number;
      count: number;
      spend: number;
      merchants: Set<string>;
    }
  >();
  const paymentTotals = new Map<
    string,
    { method: string; count: number; spend: number }
  >();
  const monthly = new Map<
    string,
    { month: string; spend: number; count: number }
  >();
  const days = new Map<string, { day: string; count: number; spend: number }>();
  const hours = new Map<
    number,
    { hour: number; count: number; spend: number }
  >();
  const dataQualityNotes = new Set<string>();
  let deliveryFeeTotal = 0;
  let deliveryFeeCount = 0;
  let discountTotal = 0;
  let discountCount = 0;

  for (const row of scopedRows) {
    const serviceType = serviceTypeForRow(row);
    const merchantName = merchantNameForRow(row);
    incrementService(serviceTotals, serviceType, row.amount);
    incrementMerchant(merchantTotals, row, serviceType, merchantName);
    incrementMonth(monthly, row.transactionDate, row.amount);
    incrementDay(days, row.transactionDate, row.amount);
    incrementHour(hours, row.transactionDate, row.amount);
    incrementPayment(paymentTotals, row.paymentMethod, row.amount);
    addItems(itemTotals, row, merchantName, dataQualityNotes);

    if (Number(row.extractionConfidence ?? 1) < 0.7) {
      dataQualityNotes.add(
        "Some rows have low extraction confidence, so merchant or item details may be incomplete.",
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
  const count = scopedRows.length;
  const dataRange = rangeForRows(merchantScopedRows);
  const busiestHour = maxBy([...hours.values()], (item) => item.count);
  if (count > 0 && busiestHour && busiestHour.count / count > 0.6) {
    dataQualityNotes.add(
      "Many rows share the same hour, so hour-of-day summaries may reflect normalized timestamps rather than actual order time.",
    );
  }

  // Surface truncation for the full-history path (triggered by the mandatory spendingOverview
  // and other !recentOnly calls). The model prompt already teaches it to cite dataRange and
  // dataQualityNotes, so this keeps answers honest for power users.
  if (!input.recentOnly && allRows.length >= FULL_HISTORY_CAP) {
    dataQualityNotes.add(
      `Data truncated to the most recent ${FULL_HISTORY_CAP} transactions for performance. Older history is not reflected in these numbers.`,
    );
  }

  return {
    dataRange: {
      startDate: dataRange.startDate,
      endDate: dataRange.endDate,
      transactionCount: merchantScopedRows.length,
    },
    totals: {
      spend,
      count,
      averageOrderValue: count ? spend / count : 0,
    },
    serviceBreakdown: [...serviceTotals.values()].sort(
      (a, b) =>
        serviceRank(a.serviceType) - serviceRank(b.serviceType) ||
        b.spend - a.spend,
    ),
    merchantBreakdown: [...merchantTotals.values()]
      .sort((a, b) => b.count - a.count || b.spend - a.spend)
      .slice(0, topLimit),
    itemBreakdown: [...itemTotals.values()]
      .sort((a, b) => b.count - a.count || b.quantity - a.quantity)
      .slice(0, topLimit)
      .map((item) => ({
        name: item.name,
        quantity: item.quantity,
        count: item.count,
        spend: item.spend,
        merchants: [...item.merchants].sort(),
      })),
    paymentBreakdown: [...paymentTotals.values()]
      .sort((a, b) => b.count - a.count || b.spend - a.spend)
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
      .map(orderDetailForRow),
    recentOrders: [...scopedRows]
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
      .slice(0, recentOrderLimit)
      .map(orderDetailForRow),
    dataQualityNotes: [...dataQualityNotes],
  };
}

async function getAssistantFinanceRows(
  userId: string,
  options: { recentFirst?: boolean; limit?: number } = {},
): Promise<AssistantFinanceRow[]> {
  const base = db
    .select({
      id: transactionsV2.id,
      merchantId: transactionsV2.merchantId,
      merchantName: transactionsV2.merchantName,
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
        eq(transactionsV2.type, "DEBIT"),
        eq(transactionsV2.status, "COMPLETED"),
      ),
    );

  const rows = await (options.recentFirst
    ? base
        .orderBy(desc(transactionsV2.transactionDate))
        .limit(options.limit ?? 200)
    : base
        .orderBy(asc(transactionsV2.transactionDate))
        .limit(options.limit ?? FULL_HISTORY_CAP));

  return rows.map((row) => ({
    ...row,
    amount: numeric(row.amount),
    merchantData: asMerchantData(row.merchantData),
  }));
}

function merchantIdMatches(
  row: AssistantFinanceRow,
  merchantIds: string[] | undefined,
) {
  const filters = (merchantIds ?? []).map(normalizeMerchantId).filter(Boolean);
  if (filters.length === 0) return true;
  const candidates = [row.merchantId, row.merchantName].map(
    normalizeMerchantId,
  );
  return filters.some((filter) => candidates.includes(filter));
}

function serviceTypeForRow(row: AssistantFinanceRow) {
  return normalizeServiceType(
    row.merchantData.serviceType ||
      row.merchantData.service ||
      row.merchantData.transaction?.serviceType ||
      row.merchantData.transaction?.service ||
      nestedMetadataService(row.merchantData),
  );
}

function nestedMetadataService(merchantData: MerchantData) {
  for (const value of Object.values(merchantData)) {
    if (!isRecord(value) || value === merchantData.transaction) continue;
    const service = cleanName(value.serviceType) || cleanName(value.service);
    if (service) return service;
  }
  return undefined;
}

function normalizeServiceType(value: unknown) {
  const raw = cleanName(value)
    ?.toUpperCase()
    .replace(/[\s-]+/g, "_");
  switch (raw) {
    case "FOOD_DELIVERY":
    case "FOODDELIVERY":
    case "DELIVERY":
      return "foodDelivery";
    case "INSTAMART":
    case "GROCERY":
    case "GROCERIES":
      return "grocery";
    case "DINEOUT":
    case "DINING":
    case "DINING_OUT":
    case "DININGOUT":
      return "dineout";
    default:
      return raw ? lowerCamel(raw) : "unknown";
  }
}

function normalizeServiceTypeFilters(values: string[] | undefined) {
  return [...new Set((values ?? []).map(normalizeServiceType))].filter(Boolean);
}

function serviceLabel(serviceType: string) {
  switch (serviceType) {
    case "foodDelivery":
      return "Food delivery";
    case "grocery":
      return "Grocery";
    case "dineout":
      return "Dineout";
    case "unknown":
      return "Unknown";
    default:
      return titleize(serviceType);
  }
}

function serviceRank(serviceType: string) {
  const index = serviceOrder.indexOf(serviceType);
  return index === -1 ? serviceOrder.length : index;
}

function merchantNameForRow(row: AssistantFinanceRow) {
  return (
    cleanName(
      row.merchantData.transaction?.restaurantName ||
        row.merchantData.transaction?.merchantName,
    ) ||
    cleanName(row.merchantName) ||
    cleanName(row.merchantId) ||
    "Unknown merchant"
  );
}

function orderDetailForRow(row: AssistantFinanceRow): AssistantFinanceOrder {
  const serviceType = serviceTypeForRow(row);
  return {
    date: formatDate(row.transactionDate),
    transactionId: row.id,
    orderId: cleanName(row.merchantData.transaction?.orderId),
    merchantId: row.merchantId,
    merchantName: merchantNameForRow(row),
    serviceType,
    serviceLabel: serviceLabel(serviceType),
    amount: row.amount,
    description: row.description,
    paymentMethod: cleanPaymentMethod(row.paymentMethod),
    items: orderItemsForRow(row),
  };
}

function orderItemsForRow(
  row: AssistantFinanceRow,
): AssistantFinanceOrderItem[] {
  const orderItems = Array.isArray(row.merchantData.transaction?.orderItems)
    ? row.merchantData.transaction.orderItems
    : [];
  return orderItems.flatMap((item) => {
    const name = cleanName(item.name);
    if (!name) return [];
    const quantity = numeric(item.quantity ?? 1) || 1;
    const unitPrice = numeric(item.price);
    if (!looksLikeItem(name, quantity, unitPrice, row.amount)) return [];
    return [{ name, quantity, spend: unitPrice * quantity }];
  });
}

function incrementService(
  totals: Map<
    string,
    { serviceType: string; label: string; count: number; spend: number }
  >,
  serviceType: string,
  amount: number,
) {
  const existing = totals.get(serviceType) ?? {
    serviceType,
    label: serviceLabel(serviceType),
    count: 0,
    spend: 0,
  };
  existing.count += 1;
  existing.spend += amount;
  totals.set(serviceType, existing);
}

function incrementMerchant(
  totals: Map<
    string,
    {
      merchantId: string | null;
      name: string;
      count: number;
      spend: number;
      serviceType: string;
    }
  >,
  row: AssistantFinanceRow,
  serviceType: string,
  merchantName: string,
) {
  const key = `${normalizeMerchantId(row.merchantId) || "unknown"}:${merchantName.toLowerCase()}`;
  const existing = totals.get(key) ?? {
    merchantId: row.merchantId,
    name: merchantName,
    count: 0,
    spend: 0,
    serviceType,
  };
  existing.count += 1;
  existing.spend += row.amount;
  totals.set(key, existing);
}

function incrementMonth(
  totals: Map<string, { month: string; spend: number; count: number }>,
  date: Date,
  amount: number,
) {
  const month = formatMonth(date);
  const existing = totals.get(month) ?? { month, spend: 0, count: 0 };
  existing.spend += amount;
  existing.count += 1;
  totals.set(month, existing);
}

function incrementDay(
  totals: Map<string, { day: string; count: number; spend: number }>,
  date: Date,
  amount: number,
) {
  const day = dayNames[date.getDay()] ?? "Unknown";
  const existing = totals.get(day) ?? { day, count: 0, spend: 0 };
  existing.spend += amount;
  existing.count += 1;
  totals.set(day, existing);
}

function incrementHour(
  totals: Map<number, { hour: number; count: number; spend: number }>,
  date: Date,
  amount: number,
) {
  const hour = date.getHours();
  const existing = totals.get(hour) ?? { hour, count: 0, spend: 0 };
  existing.spend += amount;
  existing.count += 1;
  totals.set(hour, existing);
}

function incrementPayment(
  totals: Map<string, { method: string; count: number; spend: number }>,
  paymentMethod: string | null,
  amount: number,
) {
  const method = cleanPaymentMethod(paymentMethod) ?? "Unknown";
  const existing = totals.get(method) ?? { method, count: 0, spend: 0 };
  existing.spend += amount;
  existing.count += 1;
  totals.set(method, existing);
}

function addItems(
  items: Map<
    string,
    {
      name: string;
      quantity: number;
      count: number;
      spend: number;
      merchants: Set<string>;
    }
  >,
  row: AssistantFinanceRow,
  merchantName: string,
  dataQualityNotes: Set<string>,
) {
  const countedInTransaction = new Set<string>();
  for (const item of orderItemsForRow(row)) {
    const key = item.name.toLowerCase();
    const existing = items.get(key) ?? {
      name: item.name,
      quantity: 0,
      count: 0,
      spend: 0,
      merchants: new Set<string>(),
    };
    existing.quantity += item.quantity;
    existing.spend += item.spend;
    if (!countedInTransaction.has(key)) {
      existing.count += 1;
      countedInTransaction.add(key);
    }
    existing.merchants.add(merchantName);
    items.set(key, existing);
  }

  const rawItemCount = row.merchantData.transaction?.orderItems?.length ?? 0;
  if (rawItemCount > 0 && orderItemsForRow(row).length === 0) {
    dataQualityNotes.add(
      "Some item-level fields looked corrupted and were excluded from item rankings; transaction totals were still counted.",
    );
  }
}

function looksLikeItem(
  name: string,
  quantity: number,
  unitPrice: number,
  amount: number,
) {
  if (looksLikeNonItemCharge(name)) return false;
  if (/^\d+$/.test(name)) return false;
  if (name.length > 160) return false;
  if (quantity <= 0 || quantity > 50) return false;
  if (unitPrice <= 0 || unitPrice > 100_000) return false;
  return unitPrice * quantity <= Math.max(amount * 3, amount + 1_000);
}

function looksLikeNonItemCharge(name: string) {
  return /\b(packing|packaging|platform|delivery|handling|convenience|surge|rain|tip|tax|charges?|fees?|discount|coupon)\b/i.test(
    name,
  );
}

function rangeForRows(rows: AssistantFinanceRow[]) {
  if (rows.length === 0) return { startDate: null, endDate: null };
  return {
    startDate: formatDate(rows[0]!.transactionDate),
    endDate: formatDate(rows[rows.length - 1]!.transactionDate),
  };
}

function asMerchantData(value: unknown): MerchantData {
  if (isRecord(value)) return value as MerchantData;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? (parsed as MerchantData) : {};
    } catch {
      return {};
    }
  }
  return {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function normalizeMerchantId(value: unknown) {
  return (
    cleanName(value)
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? ""
  );
}

function lowerCamel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part : `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`,
    )
    .join("");
}

function titleize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

// =============================================================================
// New narrow, tool-oriented query helpers (2026 refactor)
// Goal: Give the AI SDK the finance tool suite (6 focused tools: listOrders,
// spendingSummary, spendingTrends, topMerchants, orderDetail, spendingOverview)
// with clean arg schemas that the model can call naturally.
// model can call with parameters it decides. These are thin projections over
// the existing snapshot for a safe incremental rollout.
// =============================================================================

export interface AssistantToolFilters {
  startDate?: Date;
  endDate?: Date;
  merchantIds?: string[];
  serviceTypes?: string[];
  merchantQuery?: string;
  itemQuery?: string;
  limit?: number;
  recentOnly?: boolean;
}

/**
 * Tool 1: List individual completed orders with line items.
 * Best for: "show my last 10 orders", "find the Swiggy order from yesterday", etc.
 */
export async function listAssistantOrders(
  userId: string,
  filters: AssistantToolFilters = {},
): Promise<{
  orders: AssistantFinanceOrder[];
  dataRange: { startDate: string | null; endDate: string | null };
  count: number;
}> {
  const snapshot = await getAssistantFinanceSnapshot(userId, {
    ...filters,
    includeOrders: true,
    recentOrderLimit: filters.limit ?? (filters.recentOnly ? 15 : 30),
    limit: filters.limit ?? 30,
    topLimit: 5,
  });

  return {
    // For the "list orders" tool intent we strongly prefer a recent slice (the model
    // usually wants to see actual recent transactions). topOrdersBySpend is only a
    // fallback for the (rare) case where recentOrders is empty.
    orders: snapshot.recentOrders ?? snapshot.topOrdersBySpend ?? [],
    dataRange: snapshot.dataRange,
    count: snapshot.totals.count,
  };
}

/**
 * Tool 2: High-level spending totals + the most useful breakdowns.
 * Best for: "how much did I spend last month on grocery?", "breakdown by platform".
 */
export async function getAssistantSpendingSummary(
  userId: string,
  filters: AssistantToolFilters = {},
): Promise<{
  totals: { spend: number; count: number; averageOrderValue: number };
  dataRange: { startDate: string | null; endDate: string | null };
  serviceBreakdown: AssistantFinanceSnapshot["serviceBreakdown"];
  merchantBreakdown: AssistantFinanceSnapshot["merchantBreakdown"];
  paymentBreakdown: AssistantFinanceSnapshot["paymentBreakdown"];
  feeSummary: AssistantFinanceSnapshot["feeSummary"];
  dataQualityNotes: string[];
}> {
  const snapshot = await getAssistantFinanceSnapshot(userId, {
    ...filters,
    limit: filters.limit ?? 20,
    topLimit: 8,
  });

  return {
    totals: snapshot.totals,
    dataRange: snapshot.dataRange,
    serviceBreakdown: snapshot.serviceBreakdown,
    merchantBreakdown: snapshot.merchantBreakdown,
    paymentBreakdown: snapshot.paymentBreakdown,
    feeSummary: snapshot.feeSummary,
    dataQualityNotes: snapshot.dataQualityNotes,
  };
}

/**
 * Tool 3: Temporal patterns (monthly trend + day-of-week + hour-of-day).
 * Best for: "when do I spend the most?", "am I ordering more on weekends?".
 */
export async function getAssistantSpendingTrends(
  userId: string,
  filters: AssistantToolFilters = {},
): Promise<{
  dataRange: { startDate: string | null; endDate: string | null };
  monthlyTrend: AssistantFinanceSnapshot["monthlyTrend"];
  dayOfWeekBreakdown: AssistantFinanceSnapshot["dayOfWeekBreakdown"];
  hourBreakdown: AssistantFinanceSnapshot["hourBreakdown"];
  totals: { spend: number; count: number };
}> {
  const snapshot = await getAssistantFinanceSnapshot(userId, {
    ...filters,
    limit: filters.limit ?? 50,
  });

  return {
    dataRange: snapshot.dataRange,
    monthlyTrend: snapshot.monthlyTrend,
    dayOfWeekBreakdown: snapshot.dayOfWeekBreakdown,
    hourBreakdown: snapshot.hourBreakdown,
    totals: { spend: snapshot.totals.spend, count: snapshot.totals.count },
  };
}

/**
 * Tool 4: Top merchants by spend or frequency (with optional search).
 * Best for: "which restaurants do I order from most?", "my biggest Swiggy merchants".
 */
export async function getAssistantTopMerchants(
  userId: string,
  filters: AssistantToolFilters = {},
): Promise<{
  merchants: AssistantFinanceSnapshot["merchantBreakdown"];
  dataRange: { startDate: string | null; endDate: string | null };
  totalMerchants: number;
}> {
  const snapshot = await getAssistantFinanceSnapshot(userId, {
    ...filters,
    topLimit: filters.limit ?? 12,
    limit: filters.limit ?? 20,
  });

  return {
    merchants: snapshot.merchantBreakdown,
    dataRange: snapshot.dataRange,
    totalMerchants: snapshot.merchantBreakdown.length,
  };
}

/**
 * Tool 5: Retrieve the full details (including line items + raw context) for one specific order.
 * Best for follow-ups after the model has seen a transactionId from listAssistantOrders.
 *
 * This now uses a direct point query by primary key so it works for historical
 * transactions (not just the recent window). This fixes the previous broken
 * implementation that could only find orders inside a forced recentOnly slice.
 */
export async function getAssistantOrderDetail(
  userId: string,
  transactionId: string,
): Promise<{
  order: AssistantFinanceOrder | null;
  found: boolean;
}> {
  const rows = await db
    .select({
      id: transactionsV2.id,
      merchantId: transactionsV2.merchantId,
      merchantName: transactionsV2.merchantName,
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
        eq(transactionsV2.id, transactionId),
        eq(transactionsV2.type, "DEBIT"),
        eq(transactionsV2.status, "COMPLETED"),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return { order: null, found: false };
  }

  const first = rows[0]!;
  const row: AssistantFinanceRow = {
    ...first,
    amount: numeric(first.amount),
    merchantData: asMerchantData(first.merchantData),
  };

  const order = orderDetailForRow(row);
  return { order, found: true };
}

/**
 * Lightweight overview tool — gives the model a high-level picture of the user's
 * entire spending history before answering specific questions.
 *
 * This is the single highest-leverage addition for handling "last month",
 * low-data scenarios, Instamart-style questions, and giving good advice.
 */
export async function getUserSpendingOverview(userId: string): Promise<{
  dateRange: { startDate: string | null; endDate: string | null };
  totals: { count: number; spend: number; averageOrderValue: number };
  serviceBreakdown: Array<{
    serviceType: string;
    label: string;
    count: number;
    spend: number;
  }>;
  topMerchantsByOrders: Array<{ name: string; count: number; spend: number }>;
  topMerchantsBySpend: Array<{ name: string; count: number; spend: number }>;
  monthlyActivity: Array<{ month: string; count: number; spend: number }>;
  notes: string[];
}> {
  // Use a broad snapshot to get overall shape (this is acceptable for overview)
  const snapshot = await getAssistantFinanceSnapshot(userId, {
    recentOnly: false,
    limit: 1000,
    topLimit: 8,
  });

  const monthly = snapshot.monthlyTrend.slice(-8); // last 8 months for overview

  const notes: string[] = [];

  if (snapshot.totals.count < 15) {
    notes.push("Your transaction history is relatively limited.");
  }

  const monthsWithData = snapshot.monthlyTrend.length;
  if (monthsWithData > 0) {
    const avgPerMonth = Math.round(snapshot.totals.count / monthsWithData);
    if (avgPerMonth < 3) {
      notes.push("Spending is quite sparse across months.");
    }
  }

  return {
    dateRange: snapshot.dataRange,
    totals: snapshot.totals,
    serviceBreakdown: snapshot.serviceBreakdown,
    topMerchantsByOrders: snapshot.merchantBreakdown
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((m) => ({
        name: m.name,
        count: m.count,
        spend: Math.round(m.spend),
      })),
    topMerchantsBySpend: [...snapshot.merchantBreakdown]
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 6)
      .map((m) => ({
        name: m.name,
        count: m.count,
        spend: Math.round(m.spend),
      })),
    monthlyActivity: monthly.map((m) => ({
      month: m.month,
      count: m.count,
      spend: Math.round(m.spend),
    })),
    notes,
  };
}
