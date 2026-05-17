import type { EmailData } from "../types/email-extraction";

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
  const rawText = `${emailData.subject}\n${emailData.body}`;
  const text = normalizeText(rawText);
  const paidVia = text.match(
    /\bpaid\s+via\s+(.{2,80}?)\s*(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
  );
  const paymentMethod = cleanPaymentMethod(paidVia?.[1] ?? null);
  const amount = paidVia ? Number(paidVia[2]) : extractPaidAmount(text);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const orderId =
    text.match(/\border\s*id\b\s*[:#-]?\s*([A-Z0-9-]{5,})/i)?.[1] ||
    text.match(/\border\s*number\b\s*[:#-]?\s*([A-Z0-9-]{5,})/i)?.[1] ||
    emailData.threadId;
  const restaurant = extractRestaurant(rawText, text);
  const area = rawText.match(/area\s*:?\s*([^\n]+)/i)?.[1]?.trim() || "";
  const pincode = rawText.match(/pincode\s*:?\s*([0-9]{6})/i)?.[1] || "";

  return {
    amount,
    orderId,
    restaurant,
    description: `Swiggy order - ${restaurant}`,
    deliveryAddress: [area, pincode].filter(Boolean).join(" ").trim() || null,
    paymentMethod,
  };
}

function extractPaidAmount(text: string) {
  const preferredPatterns = [
    /\b(?:grand\s+total|order\s+total|total\s+paid|amount\s+paid|paid\s+amount|bill\s+total|total\s+amount)\b\s*:?\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /\b(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:paid|charged|debited)\b/i,
  ];
  for (const pattern of preferredPatterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  const candidates = [...text.matchAll(/(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)/gi)]
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
      return !/\b(saved|save|discount|coupon|cashback|free|fee|taxes?|gst)\b/i.test(
        candidate.context,
      );
    });

  return candidates.at(-1)?.amount ?? 0;
}

function extractRestaurant(rawText: string, normalizedText: string) {
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

  return "Swiggy";
}

function cleanRestaurant(value: string | null) {
  const restaurant = value?.replace(/\s+/g, " ").trim();
  if (!restaurant) return null;
  if (/provided by the outlet|attached invoice|swiggy limited/i.test(restaurant)) {
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
