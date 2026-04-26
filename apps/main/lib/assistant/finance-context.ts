import {
  getSwiggyAssistantSnapshot,
  type SwiggyAssistantSnapshot,
} from "@workspace/database";
import { z } from "zod";

export const assistantQueryPlanSchema = z.object({
  isFinanceQuestion: z.boolean(),
  intent: z
    .enum([
      "summary",
      "details",
      "rank",
      "trend",
      "compare",
      "breakdown",
      "extreme",
      "unknown",
    ])
    .default("summary"),
  dateRange: z
    .object({
      label: z.string(),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    })
    .nullable()
    .optional()
    .default(null),
  services: z
    .array(z.enum(["foodDelivery", "instamart", "dineout", "unknown"]))
    .default([]),
  merchantQuery: z.string().nullable().default(null),
  itemQuery: z.string().nullable().default(null),
  dimensions: z
    .array(
      z.enum([
        "service",
        "restaurant",
        "month",
        "paymentMethod",
        "dayOfWeek",
        "hour",
        "item",
        "fee",
        "order",
      ]),
    )
    .default([]),
  metrics: z
    .array(
      z.enum([
        "spend",
        "orders",
        "averageOrderValue",
        "deliveryFee",
        "discount",
      ]),
    )
    .default(["spend", "orders"]),
  includeOrders: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(10),
});

export type AssistantQueryPlan = z.infer<typeof assistantQueryPlanSchema>;

export type AssistantFinanceContext = {
  system: string;
  isFinanceQuestion: true;
  scopeLabel: string;
};

type BuildFinanceContextInput = {
  userId: string;
  userText: string;
  conversationText?: string;
  queryPlan?: AssistantQueryPlan | null;
  now?: Date;
};

type QuestionScope = {
  label: string;
  startDate?: Date;
  endDate?: Date;
  recentOrderLimit: number;
  recentOnly: boolean;
};

const financeIntentPattern =
  /\b(swiggy|instamart|dineout|restaurant|restaurants|food delivery|delivery fee|delivery fees|spend|spent|spending|expense|expenses|transaction|transactions|order|ordered|orders|meal|meals|dish|dishes|menu|buy|bought|groceries|grocery)\b/i;

const favoriteFoodPattern =
  /\b(fav|favorite|favourite|top|most|least)\b.*\b(food|foods|dish|dishes|menu|meal|meals|item|items)\b|\b(food|foods|dish|dishes|menu|meal|meals|item|items)\b.*\b(fav|favorite|favourite|top|most|least)\b/i;

export async function buildAssistantFinanceContext({
  userId,
  userText,
  conversationText,
  queryPlan,
  now = new Date(),
}: BuildFinanceContextInput): Promise<AssistantFinanceContext | null> {
  if (
    queryPlan?.isFinanceQuestion === false ||
    (!queryPlan?.isFinanceQuestion &&
      !shouldLoadFinanceContext(userText, conversationText))
  ) {
    return null;
  }

  const scope =
    scopeFromPlan(queryPlan) ??
    inferQuestionScope(userText, now, conversationText);
  const snapshot = await getSwiggyAssistantSnapshot(userId, {
    startDate: scope.startDate,
    endDate: scope.endDate,
    recentOrderLimit: queryPlan?.limit ?? scope.recentOrderLimit,
    recentOnly: scope.recentOnly,
    topLimit: Math.min(queryPlan?.limit ?? 5, 10),
    services: queryPlan?.services,
    merchantQuery: queryPlan?.merchantQuery ?? undefined,
    itemQuery: queryPlan?.itemQuery ?? undefined,
  });

  return {
    system: renderFinanceSystemContext(snapshot, scope, queryPlan),
    isFinanceQuestion: true,
    scopeLabel: scope.label,
  };
}

export function buildDeterministicQueryPlan(input: {
  userText: string;
  conversationText?: string;
  now?: Date;
}): AssistantQueryPlan | null {
  const { userText, conversationText = "", now = new Date() } = input;
  if (!shouldLoadFinanceContext(userText, conversationText)) {
    return null;
  }

  const latest = userText.toLowerCase();
  const serviceSource = latest;
  const itemQuery = inferItemQuery(userText);
  const requestedOrderLimit = inferRequestedOrderLimit(latest);
  const asksForFoodItem =
    favoriteFoodPattern.test(userText) ||
    Boolean(itemQuery) ||
    /\b(dish|dishes|menu|menu items?)\b/i.test(latest);
  const scope = inferQuestionScope(userText, now, conversationText);
  const dimensions = new Set<AssistantQueryPlan["dimensions"][number]>();
  const metrics = new Set<AssistantQueryPlan["metrics"][number]>([
    "spend",
    "orders",
  ]);

  let intent: AssistantQueryPlan["intent"] = "summary";
  const asksForExpensiveOrder =
    /\b(?:most expensive|biggest|largest|highest)\b.*\b(?:order|transaction)\b/i.test(
      latest,
    );

  if (/\b(details?|breakdown|list|show|get)\b/i.test(latest)) {
    intent = "details";
  }
  if (asksForExpensiveOrder) {
    intent = "extreme";
    dimensions.add("order");
  } else if (
    /\btrend|over time|month|monthly|highest|lowest|peak\b/i.test(latest)
  ) {
    intent = /\bhighest|lowest|peak\b/i.test(latest) ? "extreme" : "trend";
    dimensions.add("month");
  }
  if (
    !asksForExpensiveOrder &&
    /\btop|most|least|favorite|favourite|fav\b/i.test(latest)
  ) {
    intent = "rank";
  }
  if (/\brestaurant|restaurants\b/i.test(latest)) {
    dimensions.add("restaurant");
  }
  if (/\bwhere\b.*\b(?:spend|spent|spending)\b/i.test(latest)) {
    intent = "rank";
    dimensions.add("restaurant");
  }
  if (/\bcompare|vs|versus|service\b/i.test(latest)) {
    intent = "compare";
    dimensions.add("service");
  }
  if (/\binstamart|food delivery|dineout\b/i.test(latest)) {
    dimensions.add("service");
  }
  if (/\bpayment|paid|upi|card|swiggy money|method\b/i.test(latest)) {
    dimensions.add("paymentMethod");
  }
  if (/\bweekday|weekend|day of week|which day|days?\b/i.test(latest)) {
    dimensions.add("dayOfWeek");
  }
  if (
    /\bwhen\b|\busually\b|\b(?:hour|hours|time of day|morning|afternoon|evening|night|late)\b/i.test(
      latest,
    )
  ) {
    dimensions.add("hour");
  }
  if (/\bwhen\b|\busually\b/i.test(latest)) {
    dimensions.add("dayOfWeek");
  }
  if (
    asksForFoodItem ||
    /\bitem|items|dish|dishes|menu|grocery|groceries|buy|bought\b/i.test(latest)
  ) {
    dimensions.add("item");
  }
  if (/\bfee|fees|delivery fee|discount|savings|saved\b/i.test(latest)) {
    dimensions.add("fee");
    if (/\bfee|fees|delivery fee\b/i.test(latest)) metrics.add("deliveryFee");
    if (/\bdiscount|savings|saved\b/i.test(latest)) metrics.add("discount");
  }

  const includeOrders = scope.recentOnly || asksForOrderDetails(latest);
  if (includeOrders) {
    dimensions.add("order");
    if (intent === "summary") intent = "details";
  }

  if (/\baverage|avg|aov\b/i.test(latest)) {
    metrics.add("averageOrderValue");
  }

  const services: AssistantQueryPlan["services"] = [];
  if (/\binstamart\b/i.test(serviceSource)) services.push("instamart");
  if (
    /\bfood delivery|restaurant|restaurants|meal|meals|dish|dishes|menu\b/i.test(
      latest,
    ) ||
    asksForFoodItem
  ) {
    services.push("foodDelivery");
  }
  if (/\bdineout\b/i.test(serviceSource)) services.push("dineout");

  const plan = assistantQueryPlanSchema.parse({
    isFinanceQuestion: true,
    intent,
    dateRange:
      scope.startDate && scope.endDate
        ? {
            label: scope.label,
            startDate: formatDate(scope.startDate),
            endDate: formatDate(scope.endDate),
          }
        : null,
    services: [...new Set(services)],
    merchantQuery: inferMerchantQuery(userText),
    itemQuery,
    dimensions: [...dimensions],
    metrics: [...metrics],
    includeOrders,
    limit: scope.recentOnly
      ? scope.recentOrderLimit
      : asksForExpensiveOrder && requestedOrderLimit === 10
        ? 1
        : requestedOrderLimit,
  });

  return plan;
}

export function buildFinancePlannerPrompt(input: {
  userText: string;
  conversationText: string;
  today: Date;
}) {
  return `Today is ${formatDate(input.today)}.

You are planning one local SQLite data retrieval for a personal finance assistant.
Return a JSON object matching the schema. Do not answer the user.

Available semantic fields:
- domain: Swiggy transactions only
- metrics: spend, orders, averageOrderValue, deliveryFee, discount
- dimensions: service, restaurant, month, paymentMethod, dayOfWeek, hour, item, fee, order
- services: foodDelivery, instamart, dineout
- filters: merchantQuery for restaurants, itemQuery for menu/grocery item names

Conversation:
${input.conversationText || "(no prior conversation)"}

Latest user message:
${input.userText}

Rules:
- Set isFinanceQuestion true for Swiggy/spend/order/restaurant/grocery/Instamart/Dineout/payment/fee/discount questions, including follow-ups such as "show details".
- If the user asks for "details", "list", "show all orders", or references a prior count, set intent "details", includeOrders true, dimension "order", and use the referenced date range from the conversation if present.
- Use exact date ranges when the user or prior answer mentions a month like "May 2025" or "2025-05".
- For "top restaurant", use dimension "restaurant" and metrics orders/spend.
- For "favorite food" or dish/item questions, use dimension "item".
- For "highest month", use dimension "month" and sort by spend conceptually.
- Keep merchantQuery for restaurant/place names and itemQuery for menu/grocery item names.`;
}

export function isLikelyFinanceQuestion(text: string) {
  return financeIntentPattern.test(text) || favoriteFoodPattern.test(text);
}

export function inferQuestionScope(
  text: string,
  now = new Date(),
  conversationText = "",
): QuestionScope {
  const normalized = text.toLowerCase();
  const recentOrderLimit = inferRequestedOrderLimit(normalized);
  const recentOnly = isRecentOrderRequest(normalized);
  const explicitMonth = inferMonthScope(text);
  if (explicitMonth) {
    return {
      label: explicitMonth.label,
      startDate: explicitMonth.startDate,
      endDate: explicitMonth.endDate,
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\blast month\b/.test(normalized)) {
    const startDate = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
    const endDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    return {
      label: "last month",
      startDate,
      endDate,
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\bthis month\b|\bcurrent month\b/.test(normalized)) {
    return {
      label: "this month",
      startDate: startOfMonth(now),
      endDate: endOfDay(now),
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\blast quarter\b|\bprevious quarter\b/.test(normalized)) {
    const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const startDate = startOfMonth(
      new Date(now.getFullYear(), currentQuarterStartMonth - 3, 1),
    );
    const endDate = endOfDay(
      new Date(now.getFullYear(), currentQuarterStartMonth, 0),
    );
    return {
      label: "last quarter",
      startDate,
      endDate,
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\bthis quarter\b|\bcurrent quarter\b/.test(normalized)) {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return {
      label: "this quarter",
      startDate: startOfMonth(
        new Date(now.getFullYear(), quarterStartMonth, 1),
      ),
      endDate: endOfDay(now),
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\blast year\b|\bprevious year\b/.test(normalized)) {
    const year = now.getFullYear() - 1;
    return {
      label: "last year",
      startDate: startOfDay(new Date(year, 0, 1)),
      endDate: endOfDay(new Date(year, 11, 31)),
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\bthis year\b|\bcurrent year\b/.test(normalized)) {
    return {
      label: "this year",
      startDate: startOfDay(new Date(now.getFullYear(), 0, 1)),
      endDate: endOfDay(now),
      recentOrderLimit,
      recentOnly,
    };
  }

  const daysMatch = normalized.match(/\blast\s+(\d{1,3})\s+days?\b/);
  if (daysMatch?.[1]) {
    const days = Math.max(1, Math.min(Number(daysMatch[1]), 365));
    return {
      label: `last ${days} days`,
      startDate: startOfDay(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1),
      ),
      endDate: endOfDay(now),
      recentOrderLimit,
      recentOnly,
    };
  }

  const referencedMonth =
    isOrderDetailFollowUp(normalized) && conversationText
      ? inferMonthScope(conversationText)
      : null;
  if (referencedMonth) {
    return {
      label: referencedMonth.label,
      startDate: referencedMonth.startDate,
      endDate: referencedMonth.endDate,
      recentOrderLimit,
      recentOnly,
    };
  }

  return {
    label: recentOnly
      ? `last ${recentOrderLimit} orders`
      : "all available local data",
    recentOrderLimit,
    recentOnly,
  };
}

function renderFinanceSystemContext(
  snapshot: SwiggyAssistantSnapshot,
  scope: QuestionScope,
  plan?: AssistantQueryPlan | null,
) {
  const lines = [
    "Local finance context for this request:",
    "- Domain: Swiggy spending from the user's local SQLite database.",
    "- Scope: completed debit Swiggy transactions only.",
    `- Available data: ${snapshot.dataRange.transactionCount} transactions${
      snapshot.dataRange.startDate && snapshot.dataRange.endDate
        ? ` from ${snapshot.dataRange.startDate} to ${snapshot.dataRange.endDate}`
        : ""
    }.`,
    `- Question range: ${formatScope(scope)}.`,
    `- Totals in range: ${formatOrderCount(snapshot.totals.orders)}, ${formatMoney(
      snapshot.totals.spend,
    )} spend, ${formatMoney(snapshot.totals.averageOrderValue)} average order value.`,
  ];

  if (snapshot.serviceBreakdown.length > 0) {
    lines.push(
      `- Service mix: ${snapshot.serviceBreakdown
        .map(
          (item) =>
            `${item.label}: ${formatOrderCount(item.orders)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeRestaurantRankings(plan) &&
    snapshot.topRestaurantsByOrders.length > 0
  ) {
    lines.push(
      `- Top restaurants by order count: ${snapshot.topRestaurantsByOrders
        .map(
          (item) =>
            `${item.name}: ${formatOrderCount(item.orders)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeRestaurantRankings(plan) &&
    snapshot.topRestaurantsBySpend.length > 0
  ) {
    lines.push(
      `- Top restaurants by spend: ${snapshot.topRestaurantsBySpend
        .map(
          (item) =>
            `${item.name}: ${formatOrderCount(item.orders)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeDimension(plan, "item") &&
    snapshot.topFoodItems.length > 0
  ) {
    lines.push(
      `- Top food/menu items by order count: ${snapshot.topFoodItems
        .map(
          (item) =>
            `${item.name}: ${formatOrderCount(item.orders)}, ${formatQuantity(
              item.quantity,
            )} qty, ${formatMoney(item.spend)}${
              item.restaurants.length > 0
                ? ` from ${item.restaurants.slice(0, 3).join(", ")}`
                : ""
            }`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeInstamartItems(plan) &&
    snapshot.topInstamartItems.length > 0
  ) {
    lines.push(
      `- Top Instamart items by quantity: ${snapshot.topInstamartItems
        .map(
          (item) =>
            `${item.name}: ${formatQuantity(item.quantity)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeDimension(plan, "paymentMethod") &&
    snapshot.paymentBreakdown.length > 0
  ) {
    lines.push(
      `- Payment method breakdown: ${snapshot.paymentBreakdown
        .map(
          (item) =>
            `${item.method}: ${formatOrderCount(item.orders)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (snapshot.monthlyTrend.length > 0) {
    const highestMonth = maxBy(snapshot.monthlyTrend, (item) => item.spend);
    if (highestMonth && shouldIncludeDimension(plan, "month")) {
      lines.push(
        `- Highest spending month in range: ${highestMonth.month}: ${formatOrderCount(
          highestMonth.orders,
        )}, ${formatMoney(highestMonth.spend)}.`,
      );
    }

    lines.push(
      `- Monthly trend: ${snapshot.monthlyTrend
        .map(
          (item) =>
            `${item.month}: ${formatOrderCount(item.orders)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeDimension(plan, "dayOfWeek") &&
    snapshot.dayOfWeekBreakdown.length > 0
  ) {
    const busiestDay = maxBy(
      snapshot.dayOfWeekBreakdown,
      (item) => item.orders,
    );
    if (busiestDay) {
      lines.push(
        `- Busiest day by order count: ${busiestDay.day}: ${formatOrderCount(
          busiestDay.orders,
        )}, ${formatMoney(busiestDay.spend)}.`,
      );
    }
    lines.push(
      `- Day-of-week breakdown: ${snapshot.dayOfWeekBreakdown
        .map(
          (item) =>
            `${item.day}: ${formatOrderCount(item.orders)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeDimension(plan, "hour") &&
    snapshot.hourBreakdown.length > 0
  ) {
    const busiestHour = maxBy(snapshot.hourBreakdown, (item) => item.orders);
    if (busiestHour) {
      lines.push(
        `- Busiest hour by order count: ${String(busiestHour.hour).padStart(
          2,
          "0",
        )}:00: ${formatOrderCount(busiestHour.orders)}, ${formatMoney(
          busiestHour.spend,
        )}.`,
      );
    }
    lines.push(
      `- Hour breakdown: ${snapshot.hourBreakdown
        .map(
          (item) =>
            `${String(item.hour).padStart(2, "0")}:00: ${formatOrderCount(
              item.orders,
            )}, ${formatMoney(item.spend)}`,
        )
        .join("; ")}.`,
    );
  }

  if (shouldIncludeFees(plan)) {
    lines.push(
      `- Fees and discounts: delivery fees total ${formatMoney(
        snapshot.feeSummary.totalDeliveryFee,
      )}, average delivery fee ${formatMoney(
        snapshot.feeSummary.averageDeliveryFee,
      )}; discounts total ${formatMoney(
        snapshot.feeSummary.totalDiscount,
      )}, average discount ${formatMoney(snapshot.feeSummary.averageDiscount)}.`,
    );
  }

  if (
    shouldIncludeTopOrdersBySpend(plan) &&
    snapshot.topOrdersBySpend.length > 0
  ) {
    lines.push(
      `- Most expensive orders in range: ${snapshot.topOrdersBySpend
        .map(formatOrderDetail)
        .join("; ")}.`,
    );
  }

  if (shouldIncludeOrders(plan, scope) && snapshot.recentOrders.length > 0) {
    lines.push(
      `- Order details in range: ${snapshot.recentOrders
        .map(formatOrderDetail)
        .join("; ")}.`,
    );
  }

  for (const note of snapshot.dataQualityNotes.filter((value) =>
    shouldRenderDataQualityNote(value, plan),
  )) {
    lines.push(`- Data quality note: ${note}`);
  }

  lines.push(
    "Answering rules for Swiggy/local finance questions:",
    "- Use only the local finance context above for numbers.",
    "- Mention the date range when giving totals or comparisons.",
    "- If the range has zero orders, say that clearly and mention the available data range.",
    "- For top restaurant questions, use the order-count ranking unless the user asks for spend.",
    "- For favorite food questions, explain that this is inferred from menu-item order history, then use the top food/menu items by order count.",
    "- For most expensive order questions, use the most expensive orders in range.",
    "- For Instamart vs food delivery, compare the service mix.",
    "- For detail/list requests, list the orders from the order details in range.",
    "- The retrieval is based on a validated semantic query plan, not SQL generated by the model.",
    "- Do not generate SQL or mention implementation details.",
  );

  return lines.join("\n");
}

function scopeFromPlan(plan?: AssistantQueryPlan | null): QuestionScope | null {
  if (!plan?.dateRange?.startDate || !plan.dateRange.endDate) return null;
  const startDate = parseDateOnly(plan.dateRange.startDate);
  const endDate = parseDateOnly(plan.dateRange.endDate);
  if (!startDate || !endDate) return null;
  return {
    label:
      plan.dateRange.label ||
      `${plan.dateRange.startDate} to ${plan.dateRange.endDate}`,
    startDate: startOfDay(startDate),
    endDate: endOfDay(endDate),
    recentOrderLimit: plan.limit,
    recentOnly: plan.intent === "details" && !plan.dateRange,
  };
}

function shouldIncludeDimension(
  plan: AssistantQueryPlan | null | undefined,
  dimension: AssistantQueryPlan["dimensions"][number],
) {
  if (!plan) return false;
  return plan.dimensions.includes(dimension);
}

function shouldIncludeFees(plan: AssistantQueryPlan | null | undefined) {
  if (!plan) return false;
  return (
    plan.dimensions.includes("fee") ||
    plan.metrics.includes("deliveryFee") ||
    plan.metrics.includes("discount")
  );
}

function shouldIncludeRestaurantRankings(
  plan: AssistantQueryPlan | null | undefined,
) {
  if (!plan) return true;
  return (
    plan.dimensions.includes("restaurant") ||
    Boolean(plan.merchantQuery) ||
    (!plan.dimensions.includes("item") &&
      !plan.dimensions.includes("service") &&
      !plan.dimensions.includes("paymentMethod") &&
      !plan.dimensions.includes("dayOfWeek") &&
      !plan.dimensions.includes("hour") &&
      !plan.dimensions.includes("fee") &&
      !plan.dimensions.includes("order"))
  );
}

function shouldIncludeInstamartItems(
  plan: AssistantQueryPlan | null | undefined,
) {
  if (!plan) return true;
  return (
    plan.dimensions.includes("item") ||
    (plan.intent !== "compare" && plan.services.includes("instamart"))
  );
}

function shouldRenderDataQualityNote(
  note: string,
  plan: AssistantQueryPlan | null | undefined,
) {
  if (/hour-of-day/i.test(note)) return shouldIncludeDimension(plan, "hour");
  if (/Instamart item-level/i.test(note)) {
    return (
      shouldIncludeInstamartItems(plan) || shouldIncludeDimension(plan, "item")
    );
  }
  if (/Dineout/i.test(note)) {
    return (
      !plan ||
      plan.services.includes("dineout") ||
      shouldIncludeDimension(plan, "restaurant") ||
      shouldIncludeDimension(plan, "service")
    );
  }
  return true;
}

function shouldIncludeTopOrdersBySpend(
  plan: AssistantQueryPlan | null | undefined,
) {
  if (!plan) return false;
  return (
    plan.dimensions.includes("order") &&
    (plan.intent === "extreme" || plan.intent === "rank")
  );
}

function shouldIncludeOrders(
  plan: AssistantQueryPlan | null | undefined,
  scope: QuestionScope,
) {
  if (!plan) return scope.recentOnly;
  return plan.includeOrders || plan.intent === "details";
}

function formatOrderDetail(
  order: SwiggyAssistantSnapshot["recentOrders"][number],
) {
  const items =
    order.items.length > 0
      ? `; items: ${order.items
          .slice(0, 5)
          .map(
            (item) =>
              `${item.name} x${formatQuantity(item.quantity)} (${formatMoney(
                item.spend,
              )})`,
          )
          .join(", ")}`
      : "";
  return `${order.date}${order.orderId ? ` #${order.orderId}` : ""} ${serviceLabel(
    order.service,
  )} ${order.merchant}${
    order.merchant === "Unknown restaurant" && order.description
      ? ` (${truncate(order.description, 72)})`
      : ""
  } ${formatMoney(order.amount)}${
    order.paymentMethod ? ` via ${order.paymentMethod}` : ""
  }${items}`;
}

export function shouldLoadFinanceContext(
  userText: string,
  conversationText = "",
) {
  if (isLikelyFinanceQuestion(userText)) return true;
  return (
    isOrderDetailFollowUp(userText) && isLikelyFinanceQuestion(conversationText)
  );
}

function isOrderDetailFollowUp(text: string) {
  return (
    /\b(details?|breakdown|list|show|get)\b.*\b(orders?|transactions?)\b/i.test(
      text,
    ) ||
    /\b(orders?|transactions?)\b.*\b(details?|breakdown|list)\b/i.test(text) ||
    /\b(those|these|that|all)\s+\d{1,2}\s+(orders?|transactions?)\b/i.test(text)
  );
}

function asksForOrderDetails(text: string) {
  return (
    isRecentOrderRequest(text) ||
    /\b(details?|breakdown|list|show all)\b.*\b(orders?|transactions?)\b/i.test(
      text,
    ) ||
    /\bshow\b.*\b(orders?|transactions?)\b/i.test(text) ||
    /\b(orders?|transactions?)\b.*\b(details?|breakdown|list)\b/i.test(text) ||
    /\bwhat\s+did\s+i\s+(?:order|buy|get)\b/i.test(text) ||
    /\b(those|these|that|all)\s+\d{1,2}\s+(orders?|transactions?)\b/i.test(text)
  );
}

function isRecentOrderRequest(text: string) {
  return (
    /\blast\s+\d{1,2}\s+(?:swiggy\s+)?orders?\b/.test(text) ||
    /\b(?:last|latest|most recent)\s+(?:swiggy\s+)?order\b/.test(text)
  );
}

function inferRequestedOrderLimit(text: string) {
  if (/\b(?:last|latest|most recent)\s+(?:swiggy\s+)?order\b/.test(text)) {
    return 1;
  }
  const match =
    text.match(/\blast\s+(\d{1,2})\s+(?:swiggy\s+)?orders?\b/) ??
    text.match(/\b(?:all\s+)?(\d{1,2})\s+(?:swiggy\s+)?orders?\b/);
  if (!match?.[1]) return 10;
  return Math.max(1, Math.min(Number(match[1]), 50));
}

function inferMerchantQuery(text: string) {
  const quoted = text.match(/["']([^"']{2,80})["']/);
  if (quoted?.[1]) return cleanQueryCandidate(quoted[1]);

  const merchantMatch =
    text.match(/\b(?:from|at|in)\s+([A-Z][A-Za-z0-9&'. -]{2,80})/) ??
    text.match(
      /\b(?:show|list|get)\s+(?:my\s+)?([A-Z][A-Za-z0-9&'. -]{2,80})\s+(?:orders?|transactions?)\b/,
    );
  if (!merchantMatch?.[1]) return null;

  return cleanQueryCandidate(merchantMatch[1]);
}

function inferItemQuery(text: string) {
  const itemMatch = text.match(
    /\b(?:order|ordered|eat|ate|buy|bought|get|got)\s+(?!from\b|at\b|in\b)([A-Za-z][A-Za-z0-9&'.() -]{2,80}?)(?:\s+(?:from|at|in|last|this|on|during)\b|[?.!]*$)/i,
  );
  if (!itemMatch?.[1]) return null;
  return cleanQueryCandidate(itemMatch[1]);
}

function cleanQueryCandidate(value: string) {
  const candidate = value
    .replace(
      /\b(?:last|this|month|quarter|year|week|orders?|transactions?|more|most|least|often|usually)\b.*$/i,
      "",
    )
    .replace(/[?.!]+$/g, "")
    .trim();
  if (candidate.length < 2) return null;
  if (isGenericQueryCandidate(candidate)) return null;
  return candidate;
}

function isGenericQueryCandidate(value: string) {
  return /^(swiggy|instamart|dineout|food delivery|restaurant|restaurants|order|orders|transaction|transactions|food|dish|dishes|item|items|most|more|least)$/i.test(
    value,
  );
}

function inferMonthScope(text: string) {
  const monthNameMatch = findLastMatch(
    text,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/gi,
  );
  if (monthNameMatch?.[1] && monthNameMatch[2]) {
    const monthIndex = monthNames.indexOf(monthNameMatch[1].toLowerCase());
    const year = Number(monthNameMatch[2]);
    if (monthIndex >= 0 && Number.isFinite(year)) {
      return monthScope(year, monthIndex);
    }
  }

  const isoMonthMatch = findLastMatch(text, /\b(\d{4})-(\d{2})\b/g);
  if (isoMonthMatch?.[1] && isoMonthMatch[2]) {
    const year = Number(isoMonthMatch[1]);
    const monthIndex = Number(isoMonthMatch[2]) - 1;
    if (monthIndex >= 0 && monthIndex < 12 && Number.isFinite(year)) {
      return monthScope(year, monthIndex);
    }
  }

  return null;
}

function monthScope(year: number, monthIndex: number) {
  const startDate = startOfMonth(new Date(year, monthIndex, 1));
  const endDate = endOfDay(new Date(year, monthIndex + 1, 0));
  return {
    label: `${capitalize(monthNames[monthIndex] ?? "")} ${year}`,
    startDate,
    endDate,
  };
}

function findLastMatch(text: string, pattern: RegExp) {
  const matches = [...text.matchAll(pattern)];
  return matches.at(-1) ?? null;
}

function formatScope(scope: QuestionScope) {
  const recentSuffix =
    scope.recentOnly && scope.startDate
      ? `, limited to the most recent ${scope.recentOrderLimit} orders in that range`
      : "";
  if (!scope.startDate || !scope.endDate) {
    return scope.label;
  }
  return `${scope.label} (${formatDate(scope.startDate)} to ${formatDate(
    scope.endDate,
  )})${recentSuffix}`;
}

function formatMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return `Rs ${rounded.toLocaleString("en-IN", {
    maximumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
  })}`;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatOrderCount(value: number) {
  return `${value} ${value === 1 ? "order" : "orders"}`;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 3)}...`
    : value;
}

function maxBy<T>(items: T[], score: (item: T) => number) {
  return items.reduce<T | null>((best, item) => {
    if (!best || score(item) > score(best)) return item;
    return best;
  }, null);
}

function serviceLabel(
  service: SwiggyAssistantSnapshot["recentOrders"][number]["service"],
) {
  switch (service) {
    case "foodDelivery":
      return "food delivery";
    case "instamart":
      return "Instamart";
    case "dineout":
      return "Dineout";
    default:
      return "Swiggy";
  }
}

function startOfMonth(date: Date) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function capitalize(value: string) {
  return value ? `${value[0]?.toUpperCase()}${value.slice(1)}` : value;
}

const monthNames = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
