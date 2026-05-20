export type SwiggyBodySignals = {
  orderId: string | null;
  amount: number | null;
  paymentMethod: string | null;
  restaurant: string | null;
};

export function extractSwiggyBodySignals(input: {
  subject: string;
  body: string;
  threadId?: string;
}): SwiggyBodySignals {
  const rawText = `${input.subject}\n${input.body}`;
  const text = normalizeText(rawText);
  const paidVia = text.match(
    /\bpaid\s+via\s+(.{2,80}?)\s*(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
  );

  return {
    orderId: extractSwiggyOrderId(text, input.threadId),
    amount: paidVia
      ? Number(paidVia[2])
      : extractSwiggyPaidAmount(text) ?? null,
    paymentMethod: cleanPaymentMethod(paidVia?.[1] ?? null),
    restaurant: extractSwiggyRestaurant(rawText, text),
  };
}

export function isSwiggyMarketingEmail(subject: string, body: string) {
  const combined = `${subject}\n${body}`.toLowerCase();
  if (extractSwiggyOrderId(combined)) {
    return false;
  }
  if (
    /\b(order id|paid via|grand total|bill details|instamart order|dineout payment)\b/i.test(
      combined,
    )
  ) {
    return false;
  }
  return /\b(win up to|claim now|limited time offer|exclusive offer|cashback alert|coupon code|tap to claim|don't miss out)\b/i.test(
    combined,
  );
}

export function extractSwiggyOrderId(text: string, threadId?: string) {
  return (
    text.match(/\border\s*id\b\s*[:#-]?\s*([0-9]{8,})/i)?.[1] ||
    text.match(/\border\s*number\b\s*[:#-]?\s*([0-9]{8,})/i)?.[1] ||
    text.match(/\border\s*id\b\s*[:#-]?\s*([A-Z0-9-]{5,})/i)?.[1] ||
    null
  );
}

export function extractSwiggyPaidAmount(text: string) {
  const preferredPatterns = [
    /\b(?:grand\s+total|order\s+total|total\s+paid|amount\s+paid|paid\s+amount|bill\s+total|total\s+amount)\b\s*:?\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /\b(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:paid|charged|debited)\b/i,
  ];
  for (const pattern of preferredPatterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  const candidates = [
    ...text.matchAll(/(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)/gi),
  ]
    .map((match) => {
      const index = match.index ?? 0;
      return {
        amount: Number(match[1]),
        context: text.slice(Math.max(0, index - 60), index + 80),
      };
    })
    .filter((candidate) => {
      if (!Number.isFinite(candidate.amount) || candidate.amount <= 0) {
        return false;
      }
      return !/\b(saved|save|discount|coupon|cashback|free|fee|taxes?|gst|win up to)\b/i.test(
        candidate.context,
      );
    });

  return candidates.at(-1)?.amount ?? null;
}

export function extractSwiggyRestaurant(rawText: string, normalizedText: string) {
  const invoiceName = cleanRestaurant(
    rawText.match(/\bRestaurant\s+Name\s*:?\s*([^\n|]+)/i)?.[1] ?? null,
  );
  if (invoiceName) return invoiceName;

  const bodyName = cleanRestaurant(
    rawText.match(/\bRestaurant\s*:?\s*([^\n|]+)/i)?.[1] ?? null,
  );
  if (bodyName) return bodyName;

  const journeyName = cleanRestaurant(
    normalizedText.match(
      /\bORDER\s+JOURNEY\s+(.{2,120}?)(?:\s+NO\s+\d|\s+[A-Z][a-z]{2}\s+\d{1,2},|\s+Order\s+ID\s*:)/i,
    )?.[1] ?? null,
  );
  if (journeyName) return journeyName;

  const instamartStore = cleanRestaurant(
    rawText.match(/\b(?:store|delivered from)\s*:?\s*([^\n|]+)/i)?.[1] ?? null,
  );
  if (instamartStore) return instamartStore;

  return null;
}

function cleanRestaurant(value: string | null) {
  const restaurant = value?.replace(/\s+/g, " ").trim();
  if (!restaurant) return null;
  if (/provided by the outlet|attached invoice|swiggy limited|discount/i.test(restaurant)) {
    return null;
  }
  return restaurant.slice(0, 120);
}

function cleanPaymentMethod(value: string | null) {
  const method = value?.replace(/\s+/g, " ").replace(/[:|-]+$/g, "").trim();
  return method || null;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
