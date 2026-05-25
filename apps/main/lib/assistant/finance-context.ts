import {
  getAssistantFinanceSnapshot,
  type AssistantFinanceSnapshot,
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
  merchantIds: z.array(z.string().min(1)).default([]),
  serviceTypes: z.array(z.string().min(1)).default([]),
  merchantQuery: z.string().nullable().default(null),
  itemQuery: z.string().nullable().default(null),
  dimensions: z
    .array(
      z.enum([
        "service",
        "merchant",
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
        "count",
        "averageOrderValue",
        "deliveryFee",
        "discount",
      ]),
    )
    .default(["spend", "count"]),
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
  /\b(trend|monthly|restaurant|restaurants|food|food delivery|delivery fee|delivery fees|fee|fees|spend|spent|spending|expense|expenses|transaction|transactions|order|ordered|orders|meal|meals|dish|dishes|menu|buy|bought|groceries|grocery|dining|dining out|payment|paid|card|upi|wallet|money|bill|bills|discount|discounts|savings|saved|weekend|weekday)\b/i;

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
  const snapshot = await getAssistantFinanceSnapshot(userId, {
    merchantIds: queryPlan?.merchantIds,
    serviceTypes: queryPlan?.serviceTypes,
    startDate: scope.startDate,
    endDate: scope.endDate,
    includeOrders: queryPlan?.includeOrders,
    recentOrderLimit: queryPlan?.limit ?? scope.recentOrderLimit,
    recentOnly: scope.recentOnly,
    topLimit: Math.min(queryPlan?.limit ?? 5, 10),
    merchantQuery: queryPlan?.merchantQuery ?? undefined,
    itemQuery: queryPlan?.itemQuery ?? undefined,
    dimensions: queryPlan?.dimensions,
    metrics: queryPlan?.metrics,
    limit: queryPlan?.limit,
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
  const requestedOrderLimit = inferRequestedOrderLimit(
    latest,
    conversationText,
  );
  const asksForGroceryItem = /\bgroceries|grocery\b/i.test(latest);
  const asksForFoodItem =
    favoriteFoodPattern.test(userText) ||
    Boolean(itemQuery) ||
    /\b(dish|dishes|menu|menu items?)\b/i.test(latest);
  const scope = inferQuestionScope(userText, now, conversationText);
  const dimensions = new Set<AssistantQueryPlan["dimensions"][number]>();
  const metrics = new Set<AssistantQueryPlan["metrics"][number]>([
    "spend",
    "count",
  ]);

  let intent: AssistantQueryPlan["intent"] = "summary";
  const asksForExpensiveOrder =
    /\b(?:most expensive|biggest|largest|highest)\b.*\b(?:order|transaction|bill|payment)\b/i.test(
      latest,
    ) ||
    /\b(?:order|transaction|bill|payment)\b.*\b(?:most expensive|biggest|largest|highest)\b/i.test(
      latest,
    );

  if (/\b(details?|breakdown|list|show|get)\b/i.test(latest)) {
    intent = "details";
  }
  if (asksForExpensiveOrder) {
    intent = "extreme";
    dimensions.add("order");
  } else if (
    /\btrend|over time|monthly|highest|lowest|peak\b/i.test(latest) ||
    /\b(?:which|what)\s+month\b/i.test(latest)
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
  if (
    /\brestaurant|restaurants|places?|outlets?\b/i.test(latest) ||
    /\b(?:where|who)\b.*\b(?:order|ordered|spend|spent|spending)\b/i.test(
      latest,
    ) ||
    /\border(?:ed)?\b.*\bfrom\b.*\b(?:most|often)\b/i.test(latest)
  ) {
    dimensions.add("merchant");
  }
  if (/\bwhere\b.*\b(?:spend|spent|spending)\b/i.test(latest)) {
    intent = "rank";
    dimensions.add("merchant");
  }
  if (/\bcompare|vs|versus|service\b/i.test(latest)) {
    intent = "compare";
    dimensions.add("service");
  }
  if (
    /\binstamart|grocery|groceries|food delivery|dineout|dining\b/i.test(latest)
  ) {
    dimensions.add("service");
  }
  if (/\bpayment|paid|upi|card|wallet|money|method\b/i.test(latest)) {
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

  const merchantIds = inferMerchantIds(userText);
  const serviceTypes: AssistantQueryPlan["serviceTypes"] = [];
  if (/\binstamart|groceries|grocery\b/i.test(serviceSource)) {
    serviceTypes.push("grocery");
  }
  if (
    /\bfood delivery|restaurants?|meals?|dishes?|menu\b/i.test(latest) ||
    (asksForFoodItem && !asksForGroceryItem)
  ) {
    serviceTypes.push("foodDelivery");
  }
  if (/\bdineout|dining|dining out|eat(?:ing)? out\b/i.test(serviceSource)) {
    serviceTypes.push("dineout");
  }
  if (
    serviceTypes.length === 0 &&
    shouldInheritServiceScopeFromConversation(latest, intent)
  ) {
    serviceTypes.push(...inferReferencedServiceTypes(conversationText));
  }
  if (
    merchantIds.length === 0 &&
    shouldInheritMerchantScopeFromConversation(latest)
  ) {
    merchantIds.push(...inferReferencedMerchantIds(conversationText));
  }

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
    merchantIds: [...new Set(merchantIds)],
    serviceTypes: [...new Set(serviceTypes)],
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
- domain: local finance transactions from normalized transaction rows
- metrics: spend, count, averageOrderValue, deliveryFee, discount
- dimensions: service, merchant, month, paymentMethod, dayOfWeek, hour, item, fee, order
- merchantIds: optional transaction merchant ids such as a delivery platform or store
- serviceTypes: foodDelivery, grocery, dineout, or other normalized service strings
- filters: merchantQuery for merchant/place names, itemQuery for item names

Conversation:
${input.conversationText || "(no prior conversation)"}

Latest user message:
${input.userText}

Rules:
- Set isFinanceQuestion true for spend/order/restaurant/grocery/dining/payment/fee/discount questions, including follow-ups such as "show details".
- If the user asks for "details", "list", "show all orders", or references a prior count, set intent "details", includeOrders true, dimension "order", and use the referenced date range from the conversation if present.
- Use exact date ranges when the user or prior answer mentions a month like "May 2025" or "2025-05".
- For "top restaurant" or merchant questions, use dimension "merchant" and metrics count/spend.
- For "favorite food" or dish/item questions, use dimension "item".
- For "highest month", use dimension "month" and sort by spend conceptually.
- Keep merchantQuery for merchant/place names and itemQuery for item names.`;
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
  const recentOrderLimit = inferRequestedOrderLimit(
    normalized,
    conversationText,
  );
  const recentOnly = isRecentOrderRequest(normalized);
  const explicitMonth = inferMonthScope(text, now);
  if (explicitMonth) {
    return {
      label: explicitMonth.label,
      startDate: explicitMonth.startDate,
      endDate: explicitMonth.endDate,
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\btoday\b/.test(normalized)) {
    return {
      label: "today",
      startDate: startOfDay(now),
      endDate: endOfDay(now),
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\byesterday\b/.test(normalized)) {
    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
    );
    return {
      label: "yesterday",
      startDate: startOfDay(yesterday),
      endDate: endOfDay(yesterday),
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\bthis week\b|\bcurrent week\b/.test(normalized)) {
    return {
      label: "this week",
      startDate: startOfWeek(now),
      endDate: endOfDay(now),
      recentOrderLimit,
      recentOnly,
    };
  }

  if (/\blast week\b|\bprevious week\b/.test(normalized)) {
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
    return {
      label: "last week",
      startDate: startOfDay(lastWeekStart),
      endDate: endOfDay(lastWeekEnd),
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

  const referencedMonth = shouldInheritDateRangeFromConversation(
    normalized,
    conversationText,
  )
    ? inferMonthScope(conversationText, now)
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
  snapshot: AssistantFinanceSnapshot,
  scope: QuestionScope,
  plan?: AssistantQueryPlan | null,
) {
  const lines = [
    "Local finance context for this request:",
    "- Domain: local finance transactions from the user's SQLite database.",
    "- Scope: completed debit transactions only.",
    ...(plan?.merchantIds.length
      ? [`- Merchant ids: ${plan.merchantIds.join(", ")}.`]
      : []),
    `- Available data: ${snapshot.dataRange.transactionCount} transactions${
      snapshot.dataRange.startDate && snapshot.dataRange.endDate
        ? ` from ${snapshot.dataRange.startDate} to ${snapshot.dataRange.endDate}`
        : ""
    }.`,
    `- Question range: ${formatScope(scope)}.`,
    `- Totals in range: ${formatCount(snapshot.totals.count)}, ${formatMoney(
      snapshot.totals.spend,
    )} spend, ${formatMoney(snapshot.totals.averageOrderValue)} average order value.`,
  ];

  if (snapshot.serviceBreakdown.length > 0) {
    lines.push(
      `- Service mix: ${snapshot.serviceBreakdown
        .map(
          (item) =>
            `${item.label}: ${formatCount(item.count)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeMerchantRankings(plan) &&
    snapshot.merchantBreakdown.length > 0
  ) {
    lines.push(
      `- Top merchants by count: ${snapshot.merchantBreakdown
        .map(
          (item) =>
            `${item.name}: ${formatCount(item.count)}, ${formatMoney(
              item.spend,
            )}`,
        )
        .join("; ")}.`,
    );
  }

  if (
    shouldIncludeDimension(plan, "item") &&
    snapshot.itemBreakdown.length > 0
  ) {
    lines.push(
      `- Top items by count: ${snapshot.itemBreakdown
        .map(
          (item) =>
            `${item.name}: ${formatCount(item.count)}, ${formatQuantity(
              item.quantity,
            )} qty, ${formatMoney(item.spend)}${
              item.merchants.length > 0
                ? ` from ${item.merchants.slice(0, 3).join(", ")}`
                : ""
            }`,
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
            `${item.method}: ${formatCount(item.count)}, ${formatMoney(
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
        `- Highest spending month in range: ${highestMonth.month}: ${formatCount(
          highestMonth.count,
        )}, ${formatMoney(highestMonth.spend)}.`,
      );
    }

    lines.push(
      `- Monthly trend: ${snapshot.monthlyTrend
        .map(
          (item) =>
            `${item.month}: ${formatCount(item.count)}, ${formatMoney(
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
    const busiestDay = maxBy(snapshot.dayOfWeekBreakdown, (item) => item.count);
    if (busiestDay) {
      lines.push(
        `- Busiest day by count: ${busiestDay.day}: ${formatCount(
          busiestDay.count,
        )}, ${formatMoney(busiestDay.spend)}.`,
      );
    }
    lines.push(
      `- Day-of-week breakdown: ${snapshot.dayOfWeekBreakdown
        .map(
          (item) =>
            `${item.day}: ${formatCount(item.count)}, ${formatMoney(
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
    const busiestHour = maxBy(snapshot.hourBreakdown, (item) => item.count);
    if (busiestHour) {
      lines.push(
        `- Busiest hour by count: ${String(busiestHour.hour).padStart(
          2,
          "0",
        )}:00: ${formatCount(busiestHour.count)}, ${formatMoney(
          busiestHour.spend,
        )}.`,
      );
    }
    lines.push(
      `- Hour breakdown: ${snapshot.hourBreakdown
        .map(
          (item) =>
            `${String(item.hour).padStart(2, "0")}:00: ${formatCount(
              item.count,
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
    "Answering rules for local finance questions:",
    "- Use only the local finance context above for numbers.",
    "- Mention the date range when giving totals or comparisons.",
    "- If the range has zero transactions, say that clearly and mention the available data range.",
    "- For top merchant or restaurant questions, use the merchant count ranking unless the user asks for spend.",
    "- For favorite item questions, explain that this is inferred from item-level history, then use the top items by count.",
    "- For most expensive transaction questions, use the most expensive orders in range.",
    "- For service comparisons, compare the service mix.",
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

function shouldIncludeMerchantRankings(
  plan: AssistantQueryPlan | null | undefined,
) {
  if (!plan) return true;
  return (
    plan.dimensions.includes("merchant") ||
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

function shouldRenderDataQualityNote(
  note: string,
  plan: AssistantQueryPlan | null | undefined,
) {
  if (/hour-of-day/i.test(note)) return shouldIncludeDimension(plan, "hour");
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
  return (
    plan.includeOrders ||
    (plan.intent === "details" && plan.dimensions.includes("order"))
  );
}

function formatOrderDetail(
  order: AssistantFinanceSnapshot["recentOrders"][number],
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
  return `${order.date}${order.orderId ? ` #${order.orderId}` : ""} ${
    order.serviceLabel
  } ${order.merchantName}${
    order.merchantName === "Unknown merchant" && order.description
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
    isLikelyFinanceQuestion(conversationText) &&
    isContextualFinanceFollowUp(userText)
  );
}

function isOrderDetailFollowUp(text: string) {
  return (
    isTerseOrderDetailFollowUp(text) ||
    /\b(details?|breakdown|list|show|get)\b.*\b(orders?|transactions?)\b/i.test(
      text,
    ) ||
    /\b(orders?|transactions?)\b.*\b(details?|breakdown|list)\b/i.test(text) ||
    /\b(those|these|that|all)\s+\d{1,2}\s+(orders?|transactions?)\b/i.test(text)
  );
}

function asksForOrderDetails(text: string) {
  return (
    isTerseOrderDetailFollowUp(text) ||
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

function isTerseOrderDetailFollowUp(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[?.!]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > 80) return false;
  return (
    /^(?:details?|breakdown|list)$/.test(normalized) ||
    /^(?:give|show|get|send)\s+(?:me\s+)?(?:the\s+)?(?:details?|detail|breakdown|list)(?:\s+(?:please|pls))?$/.test(
      normalized,
    ) ||
    /^(?:show|list)\s+(?:them|those|these|it|all)(?:\s+(?:please|pls))?$/.test(
      normalized,
    )
  );
}

function isContextualFinanceFollowUp(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[?.!]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > 140) return false;
  if (isOrderDetailFollowUp(normalized)) return true;
  if (
    /^(?:and|also|same|same thing|same for|what about|how about|for|only|just|break it down|compare that|compare it)\b/.test(
      normalized,
    )
  ) {
    return true;
  }
  return /\b(average|avg|aov|payment|paid|card|upi|fee|fees|discount|discounts|savings|saved|restaurants?|places?|items?|orders?|spend|spent|total|count|instamart|dineout|dining out|food delivery|food|groceries|grocery|today|yesterday|last week|this week|last month|this month|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
    normalized,
  );
}

function isRecentOrderRequest(text: string) {
  return (
    /\blast\s+\d{1,2}\s+orders?\b/.test(text) ||
    /\b(?:last|latest|most recent)\s+(?:(?!month|week|year|quarter)[a-z0-9&'.-]+\s+){0,4}order\b/.test(
      text,
    )
  );
}

function inferRequestedOrderLimit(text: string, conversationText = "") {
  return (
    inferExplicitRequestedOrderLimit(text) ??
    (isOrderDetailFollowUp(text)
      ? inferReferencedOrderLimit(conversationText)
      : null) ??
    10
  );
}

function inferExplicitRequestedOrderLimit(text: string) {
  if (
    /\b(?:last|latest|most recent)\s+(?:(?!month|week|year|quarter)[a-z0-9&'.-]+\s+){0,4}order\b/.test(
      text,
    )
  ) {
    return 1;
  }
  const match =
    text.match(/\blast\s+(\d{1,2})\s+orders?\b/) ??
    text.match(
      /\b(?:all\s+)?(\d{1,2})\s+(?:(?!orders?\b)[a-z0-9&'.-]+\s+){0,4}orders?\b/,
    ) ??
    text.match(/\b(?:all\s+)?(\d{1,2})\s+orders?\b/);
  if (!match?.[1]) return null;
  return Math.max(1, Math.min(Number(match[1]), 50));
}

function inferMerchantQuery(text: string) {
  const quoted = text.match(/["']([^"']{2,80})["']/);
  if (quoted?.[1]) return cleanMerchantQueryCandidate(quoted[1]);

  const merchantMatch =
    text.match(/\b(?:from|at|in)\s+([A-Z][A-Za-z0-9&'. -]{2,80})/i) ??
    text.match(
      /\b(?:show|list|get)\s+(?:my\s+)?([A-Z][A-Za-z0-9&'. -]{2,80})\s+(?:orders?|transactions?)\b/i,
    );
  if (!merchantMatch?.[1]) return null;

  return cleanMerchantQueryCandidate(merchantMatch[1]);
}

function inferMerchantIds(text: string) {
  const merchantIds: string[] = [];
  const patterns = [
    /\b(?:on|via|through)\s+([A-Za-z][A-Za-z0-9&'. -]{2,80}?)(?=\s+(?:food delivery|grocery|groceries|dining|dining out|dineout|across|over|last|this|in|for|during|orders?|transactions?|spend|spent|today|yesterday|month|year|week|quarter)\b|[?.!]*$)/i,
    /\b(?:show|list|get)\s+(?:my\s+)?(?:all\s+)?(?:\d{1,2}\s+)?(?:today'?s\s+)?([A-Za-z][A-Za-z0-9&'. -]{2,80}?)\s+orders?\b/i,
    /\b(?:last|latest|most recent|most expensive|biggest|largest|highest)\s+([A-Za-z][A-Za-z0-9&'. -]{2,80}?)\s+(?:order|transaction|bill|payment)\b/i,
    /\b(?:highest|lowest|peak|biggest|largest)\s+([A-Za-z][A-Za-z0-9&'. -]{2,80}?)\s+spend\b/i,
    /\bmonthly\s+([A-Za-z][A-Za-z0-9&'. -]{2,80}?)\s+trend\b/i,
    /^\s*([A-Za-z][A-Za-z0-9&'. -]{2,80}?)\s+(?:spend|orders?|transactions?|trend)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const candidate = cleanMerchantIdCandidate(match[1]);
    if (candidate) {
      merchantIds.push(candidate);
      break;
    }
  }
  return merchantIds;
}

function inferItemQuery(text: string) {
  if (isOrderDetailFollowUp(text)) return null;
  if (
    /\b(?:average|avg)\s+order\s+value\b|\baov\b|\border\s+(?:value|count|counts|total|totals|breakdown|details?)\b/i.test(
      text,
    )
  ) {
    return null;
  }

  const itemMatch = text.match(
    /\b(?:order|ordered|eat|ate|buy|bought|get|got)\s+(?!from\b|at\b|in\b)([A-Za-z][A-Za-z0-9&'.() -]{2,80}?)(?:\s+(?:from|at|in|last|this|on|during)\b|[?.!]*$)/i,
  );
  if (!itemMatch?.[1]) return null;
  return cleanQueryCandidate(itemMatch[1]);
}

function cleanQueryCandidate(value: string) {
  const candidate = value
    .replace(
      /\b(?:across|over|last|this|month|quarter|year|week|orders?|transactions?|spend|spent|more|most|least|often|usually)\b.*$/i,
      "",
    )
    .replace(
      /^(?:my|the|a|an|today'?s|monthly|weekly|daily|last|latest|most recent|most expensive|biggest|largest|highest)\s+/i,
      "",
    )
    .replace(/[?.!]+$/g, "")
    .trim();
  if (candidate.length < 2) return null;
  if (isGenericQueryCandidate(candidate)) return null;
  return candidate;
}

function cleanMerchantQueryCandidate(value: string) {
  const candidate = cleanQueryCandidate(value);
  if (!candidate) return null;
  if (isServicePhrase(candidate)) return null;
  return candidate;
}

function cleanMerchantIdCandidate(value: string) {
  const candidate = cleanQueryCandidate(value);
  if (!candidate) return null;
  if (isContextualReference(candidate)) return null;
  if (isQuestionStem(candidate)) return null;
  if (isServicePhrase(candidate)) return null;
  return candidate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isServicePhrase(value: string) {
  return /^(food delivery|delivery|restaurant|restaurants|meal|meals|dish|dishes|menu|grocery|groceries|instamart|dineout|dining out|orders?|transactions?)$/i.test(
    value,
  );
}

function isContextualReference(value: string) {
  return /^(those|these|that|them|it|all|same|same thing)$/i.test(value.trim());
}

function isQuestionStem(value: string) {
  return /\b(?:how|what|which|when|where|why|did|do|show|list|get|send|i|my|me|usually)\b/i.test(
    value,
  );
}

function shouldInheritServiceScopeFromConversation(
  text: string,
  intent: AssistantQueryPlan["intent"],
) {
  if (!isContextualFinanceFollowUp(text)) return false;
  if (asksForCrossRangeQuestion(text)) return false;
  if (isRecentOrderRequest(text)) return false;
  return intent === "details" || intent === "summary" || intent === "rank";
}

function shouldInheritMerchantScopeFromConversation(text: string) {
  if (!isContextualFinanceFollowUp(text)) return false;
  if (asksForCrossRangeQuestion(text)) return false;
  if (isRecentOrderRequest(text)) return false;
  return true;
}

function shouldInheritDateRangeFromConversation(
  text: string,
  conversationText: string,
) {
  if (!conversationText) return false;
  if (!isContextualFinanceFollowUp(text)) return false;
  if (asksForCrossRangeQuestion(text)) return false;
  if (isRecentOrderRequest(text)) return false;
  return true;
}

function asksForCrossRangeQuestion(text: string) {
  return /\b(?:which|what)\s+month\b|\bmonthly\b|\btrend\b|\bover time\b|\bhighest\b.*\bmonth\b|\blowest\b.*\bmonth\b|\bpeak\b.*\bmonth\b/i.test(
    text,
  );
}

function inferReferencedServiceTypes(
  conversationText: string,
): AssistantQueryPlan["serviceTypes"] {
  for (const message of recentConversationMessages(conversationText)) {
    if (!isLikelyFinanceQuestion(message)) continue;
    const serviceTypes = serviceTypesMentionedInText(message);
    if (serviceTypes.length === 1) return serviceTypes;
    if (serviceTypes.length > 1) return [];
  }
  return [];
}

function inferReferencedMerchantIds(conversationText: string) {
  for (const message of recentConversationMessages(conversationText)) {
    if (!isLikelyFinanceQuestion(message)) continue;
    const merchantIds = inferMerchantIds(message);
    if (merchantIds.length > 0) return merchantIds;
  }
  return [];
}

function inferReferencedOrderLimit(conversationText: string) {
  for (const message of recentConversationMessages(conversationText)) {
    if (!isLikelyFinanceQuestion(message)) continue;

    const primaryCount = message.match(
      /\b(?:across|over)\s+(\d{1,2})\s+orders?\b/i,
    )?.[1];
    if (primaryCount) {
      return Math.max(1, Math.min(Number(primaryCount), 50));
    }

    const counts = [
      ...new Set(
        [...message.matchAll(/\b(\d{1,2})\s+orders?\b/gi)]
          .map((match) => Number(match[1]))
          .filter((value) => Number.isFinite(value)),
      ),
    ];
    if (counts.length === 1) {
      return Math.max(1, Math.min(counts[0]!, 50));
    }
    if (counts.length > 1) return null;
  }
  return null;
}

function recentConversationMessages(conversationText: string) {
  return conversationText
    .split(/\n(?=(?:user|assistant):)/i)
    .map((message) => message.trim())
    .filter(Boolean)
    .reverse();
}

function serviceTypesMentionedInText(
  text: string,
): AssistantQueryPlan["serviceTypes"] {
  const serviceTypes = new Set<AssistantQueryPlan["serviceTypes"][number]>();
  if (/\bfood delivery\b/i.test(text)) serviceTypes.add("foodDelivery");
  if (/\binstamart|groceries|grocery\b/i.test(text)) {
    serviceTypes.add("grocery");
  }
  if (/\bdineout|dining|dining out|eat(?:ing)? out\b/i.test(text)) {
    serviceTypes.add("dineout");
  }
  return [...serviceTypes];
}

function isGenericQueryCandidate(value: string) {
  return (
    /^(food delivery|restaurant|restaurants|order|orders|transaction|transactions|food|dish|dishes|item|items|most|more|least)$/i.test(
      value,
    ) ||
    /^(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+\d{4})?$/i.test(
      value,
    ) ||
    /^\d{4}-\d{2}(?:-\d{2})?$/.test(value)
  );
}

function inferMonthScope(text: string, now = new Date()) {
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

  const monthWithoutYearMatch = findLastMatch(
    text,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b(?!\s+\d{4})/gi,
  );
  if (monthWithoutYearMatch?.[1]) {
    const monthIndex = monthNames.indexOf(
      monthWithoutYearMatch[1].toLowerCase(),
    );
    if (monthIndex >= 0) {
      const year =
        monthIndex > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
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

function formatCount(value: number) {
  return `${value} ${value === 1 ? "transaction" : "transactions"}`;
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

function startOfMonth(date: Date) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date: Date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  value.setDate(value.getDate() - daysSinceMonday);
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
