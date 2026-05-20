import type { EmailData } from "../types/email-extraction";
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
