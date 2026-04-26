import type { EmailData } from "../types/email-extraction";

export type FallbackSwiggyExtraction = {
  amount: number;
  orderId: string;
  restaurant: string;
  description: string;
  deliveryAddress: string | null;
};

export function fallbackSwiggy(
  emailData: Pick<EmailData, "subject" | "body" | "threadId">,
): FallbackSwiggyExtraction | null {
  const text = `${emailData.subject}\n${emailData.body}`;
  const amountMatch = text.match(
    /(?:total|amount|paid|₹|INR)\s*:?\s*₹?\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
  );
  const amount = amountMatch ? Number(amountMatch[1]) : 0;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const orderId =
    text.match(/\border\s*id\b\s*[:#-]?\s*([A-Z0-9-]{5,})/i)?.[1] ||
    text.match(/\border\s*number\b\s*[:#-]?\s*([A-Z0-9-]{5,})/i)?.[1] ||
    emailData.threadId;
  const restaurant =
    text.match(/restaurant\s*:?\s*([^\n]+)/i)?.[1]?.trim() || "Swiggy";
  const area = text.match(/area\s*:?\s*([^\n]+)/i)?.[1]?.trim() || "";
  const pincode = text.match(/pincode\s*:?\s*([0-9]{6})/i)?.[1] || "";

  return {
    amount,
    orderId,
    restaurant,
    description: `Swiggy order - ${restaurant}`,
    deliveryAddress: [area, pincode].filter(Boolean).join(" ").trim() || null,
  };
}
