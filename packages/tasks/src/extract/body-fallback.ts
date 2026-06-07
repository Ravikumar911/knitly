import type { EmailData } from "../types/email-extraction";
import type { MerchantConfig } from "../merchants/types";
import {
  extractSwiggyBodySignals,
  isSwiggyMarketingEmail,
} from "./swiggy-body-signals";

export type FallbackSwiggyExtraction = {
  amount: number;
  orderId: string;
  restaurant: string;
  description: string;
  deliveryAddress: string | null;
  paymentMethod: string | null;
};

export function fallbackSwiggy(
  emailData: Pick<EmailData, "subject" | "body" | "threadId">,
): FallbackSwiggyExtraction | null {
  if (isSwiggyMarketingEmail(emailData.subject, emailData.body)) {
    return null;
  }

  const signals = extractSwiggyBodySignals(emailData);
  if (
    !signals.amount ||
    !Number.isFinite(signals.amount) ||
    signals.amount <= 0
  ) {
    return null;
  }

  const orderId = signals.orderId || emailData.threadId;
  const restaurant = signals.restaurant || "Swiggy";
  const rawText = `${emailData.subject}\n${emailData.body}`;
  const area = rawText.match(/area\s*:?\s*([^\n]+)/i)?.[1]?.trim() || "";
  const pincode = rawText.match(/pincode\s*:?\s*([0-9]{6})/i)?.[1] || "";

  return {
    amount: signals.amount,
    orderId,
    restaurant,
    description: `Swiggy order - ${restaurant}`,
    deliveryAddress: [area, pincode].filter(Boolean).join(" ").trim() || null,
    paymentMethod: signals.paymentMethod,
  };
}

export type FallbackFoodDeliveryExtraction = {
  amount: number;
  // Body fallback v1 intentionally supports dollar-denominated Western receipts only.
  currency: "USD";
  orderId: string;
  restaurant: string;
  description: string;
  paymentMethod: string | null;
  deliveryAddress: string | null;
};

export function fallbackFoodDelivery(
  emailData: Pick<EmailData, "subject" | "body" | "threadId">,
  merchant: Pick<MerchantConfig, "id" | "name">,
): FallbackFoodDeliveryExtraction | null {
  if (!hasFoodDeliverySignals(emailData.subject, emailData.body, merchant)) {
    return null;
  }

  if (isFoodDeliveryMarketingEmail(emailData.subject, emailData.body)) {
    return null;
  }

  const rawText = `${emailData.subject}\n${emailData.body}`;
  const text = normalizeBody(rawText);
  const amount = extractUsdPaidAmount(text);

  if (!amount || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const restaurant = extractFoodDeliveryRestaurant(rawText, text, merchant);
  const orderId = extractFoodDeliveryOrderId(text) || emailData.threadId;

  return {
    amount,
    currency: "USD",
    orderId,
    restaurant,
    description: `${merchant.name} order - ${restaurant}`,
    paymentMethod: extractFoodDeliveryPaymentMethod(rawText),
    deliveryAddress: extractFoodDeliveryAddress(rawText),
  };
}

function hasFoodDeliverySignals(
  subject: string,
  body: string,
  merchant: Pick<MerchantConfig, "id" | "name">,
) {
  const combined = `${subject}\n${body}`.toLowerCase();

  if (merchant.id === "uber-eats") {
    return /\buber\s*eats\b|\border\s+from\b|\byour\s+order\s+from\b|\bdelivered\s+to\b|\border\s+total\b/i.test(
      combined,
    );
  }

  if (merchant.id === "doordash") {
    return /\bdoordash\b|\bdashpass\b|\border\s+total\b|\bamount\s+charged\b/i.test(
      combined,
    );
  }

  return true;
}

export function isFoodDeliveryMarketingEmail(subject: string, body: string) {
  const combined = `${subject}\n${body}`.toLowerCase();
  if (
    /\b(order total|amount charged|you paid|charged to|receipt|order #|order number)\b/i.test(
      combined,
    )
  ) {
    return false;
  }
  return /\b(promo code|limited time|save \$|save now|deal|offer|discount|free delivery|dashpass|uber one)\b/i.test(
    combined,
  );
}

function extractUsdPaidAmount(text: string) {
  const preferredPatterns = [
    /\b(?:order\s+total|total\s+paid|amount\s+charged|you\s+paid|charged|total)\b\s*:?\s*\$([0-9]+(?:\.[0-9]{1,2})?)/i,
    /\$([0-9]+(?:\.[0-9]{1,2})?)\s*(?:charged|paid|total)\b/i,
  ];

  for (const pattern of preferredPatterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  const candidates = [...text.matchAll(/\$([0-9]+(?:\.[0-9]{1,2})?)/gi)]
    .map((match) => {
      const index = match.index ?? 0;
      return {
        amount: Number(match[1]),
        context: text.slice(Math.max(0, index - 70), index + 90),
      };
    })
    .filter((candidate) => {
      if (!Number.isFinite(candidate.amount) || candidate.amount <= 0) {
        return false;
      }
      return !/\b(subtotal|tax|taxes|fees?|delivery fee|service fee|tip|discount|promo|credit|refund|saved|membership|dashpass|uber one)\b/i.test(
        candidate.context,
      );
    });

  return candidates.at(-1)?.amount ?? null;
}

function extractFoodDeliveryOrderId(text: string) {
  return (
    text.match(
      /\border\s*(?:(?:id|number)\b|#)\s*:?\s*#?([A-Z0-9-]{5,})/i,
    )?.[1] ||
    text.match(
      /\breceipt\s*(?:(?:id|number)\b|#)\s*:?\s*#?([A-Z0-9-]{5,})/i,
    )?.[1] ||
    null
  );
}

function extractFoodDeliveryRestaurant(
  rawText: string,
  normalizedText: string,
  merchant: Pick<MerchantConfig, "id" | "name">,
) {
  const explicit = cleanFoodDeliveryName(
    rawText.match(/\b(?:restaurant|store|merchant)\s*:?\s*([^\n|]+)/i)?.[1] ??
      null,
  );
  if (explicit) return explicit;

  const lineBoundOrderFrom = cleanFoodDeliveryName(
    rawText.match(/\border\s+from\s+([^\n|]+)/i)?.[1] ?? null,
  );
  if (lineBoundOrderFrom) return lineBoundOrderFrom;

  const orderFrom = cleanFoodDeliveryName(
    normalizedText.match(
      /\border\s+from\s+(.{2,100}?)(?:\s+has\s+been|\s+is\s+complete|\s+was\s+delivered|\s+\$|\s+order\s+total|\s+total|\s+delivered|\s+order\s+#)/i,
    )?.[1] ?? null,
  );
  if (orderFrom) return orderFrom;

  const yourOrderFrom = cleanFoodDeliveryName(
    normalizedText.match(
      /\byour\s+order\s+from\s+(.{2,100}?)(?:\s+has\s+been|\s+is\s+complete|\s+was\s+delivered|\s+\$)/i,
    )?.[1] ?? null,
  );
  if (yourOrderFrom) return yourOrderFrom;

  if (merchant.id === "uber-eats") {
    const uberTaste = cleanFoodDeliveryName(
      normalizedText.match(
        /\bgreat\s+taste[,!]?\s+(.{2,100}?)(?:\s+here(?:'s| is)\s+your|\s+order\s+total|\s+\$)/i,
      )?.[1] ?? null,
    );
    if (uberTaste) return uberTaste;
  }

  return merchant.name;
}

function extractFoodDeliveryPaymentMethod(rawText: string) {
  const method =
    rawText.match(
      /\b(?:paid\s+with|payment\s+method|charged\s+to|paid\s+via)\s*:?\s*([^\n|]{2,80})/i,
    )?.[1] ??
    rawText.match(
      /\b(Visa|Mastercard|Amex|American Express|Discover|Apple Pay|Google Pay|PayPal|Uber Cash|DoorDash Credits)[^\n|]{0,60}/i,
    )?.[0] ??
    null;

  return cleanFoodDeliveryName(method);
}

function extractFoodDeliveryAddress(rawText: string) {
  return (
    rawText
      .match(
        /\b(?:delivered\s+to|delivery\s+address)\s*:?\s*([^\n|]{6,160})/i,
      )?.[1]
      ?.trim() || null
  );
}

function cleanFoodDeliveryName(value: string | null) {
  const cleaned = value
    ?.replace(/\s+/g, " ")
    .replace(/[:|-]+$/g, "")
    .trim();
  if (!cleaned) return null;
  if (
    /\b(order total|total paid|receipt|tax|tip|subtotal|delivery fee|service fee|unsubscribe|view receipt)\b/i.test(
      cleaned,
    )
  ) {
    return null;
  }
  return cleaned.slice(0, 120);
}

function normalizeBody(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
