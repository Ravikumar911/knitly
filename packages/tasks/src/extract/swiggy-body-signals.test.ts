import { describe, expect, it } from "vitest";
import {
  extractSwiggyBodySignals,
  isSwiggyMarketingEmail,
} from "./swiggy-body-signals";

describe("swiggy body signals", () => {
  it("detects marketing email without an order receipt", () => {
    expect(
      isSwiggyMarketingEmail(
        "Ravikumar, win up to ₹600 today!",
        "Tap to claim your reward now.",
      ),
    ).toBe(true);
  });

  it("does not classify delivery receipts as marketing", () => {
    expect(
      isSwiggyMarketingEmail(
        "Your Swiggy order was delivered on time",
        "Order ID: 236403526545349 Paid Via Swiggy Money ₹208.00",
      ),
    ).toBe(false);
  });

  it("extracts paid-via amount and order id from delivery receipts", () => {
    expect(
      extractSwiggyBodySignals({
        subject: "Your Swiggy order was successfully delivered",
        body: "Order ID: 236008303060924 Paid Via Credit/Debit card ₹301.00",
      }),
    ).toMatchObject({
      orderId: "236008303060924",
      amount: 301,
      paymentMethod: "Credit/Debit card",
    });
  });
});
