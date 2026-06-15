import { describe, expect, it } from "vitest";
import { DoorDashMerchant } from "../merchants/doordash";
import { UberEatsMerchant } from "../merchants/uber-eats";
import { fallbackFoodDelivery, fallbackSwiggy } from "./body-fallback";

describe("fallbackSwiggy", () => {
  it("extracts a deterministic fallback payload from the email body", () => {
    const result = fallbackSwiggy({
      threadId: "thread-123",
      subject: "Your Swiggy order",
      body: [
        "Order ID: SW123456789",
        "Restaurant: Meghana Foods",
        "Area: Indiranagar",
        "Pincode: 560038",
        "Total paid: INR 482.50",
      ].join("\n"),
    });

    expect(result).toEqual({
      amount: 482.5,
      orderId: "SW123456789",
      restaurant: "Meghana Foods",
      description: "Swiggy order - Meghana Foods",
      deliveryAddress: "Indiranagar 560038",
      paymentMethod: null,
    });
  });

  it("returns null when it cannot find a positive amount", () => {
    expect(
      fallbackSwiggy({
        threadId: "thread-123",
        subject: "Your Swiggy order",
        body: "Order ID: SW123456789",
      }),
    ).toBeNull();
  });
});

describe("fallbackFoodDelivery", () => {
  it("extracts an Uber Eats receipt from the email body", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "uber-thread-123",
        subject: "Your Uber Eats order from Sweetgreen",
        body: [
          "Your order from Sweetgreen has been delivered",
          "Order total: $24.63",
          "Paid with Visa •••• 4242",
          "Delivered to: 100 Market St, San Francisco, CA 94105",
        ].join("\n"),
      },
      UberEatsMerchant,
    );

    expect(result).toEqual({
      amount: 24.63,
      currency: "USD",
      orderId: "uber-thread-123",
      restaurant: "Sweetgreen",
      description: "Uber Eats order - Sweetgreen",
      paymentMethod: "Visa •••• 4242",
      deliveryAddress: "100 Market St, San Francisco, CA 94105",
    });
  });

  it("does not treat generic Uber ride receipts as Uber Eats orders", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "uber-trip-thread-123",
        subject: "Your trip with Uber",
        body: [
          "Thanks for riding, Ravi",
          "Total $18.45",
          "Charged to Visa ending in 4242",
          "You rode from Market St to Mission St",
        ].join("\n"),
      },
      UberEatsMerchant,
    );

    expect(result).toBeNull();
  });

  it("does not silently label non-dollar receipts as USD", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "uber-cad-thread-123",
        subject: "Your Uber Eats order from Pizzeria Libretto",
        body: [
          "Your order from Pizzeria Libretto has been delivered",
          "Order total: CAD 24.63",
          "Paid with Visa ending in 4242",
        ].join("\n"),
      },
      UberEatsMerchant,
    );

    expect(result).toBeNull();
  });

  it("extracts a DoorDash receipt while ignoring fee rows", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "dash-thread-123",
        subject: "Your DoorDash order has been delivered",
        body: [
          "Restaurant: Taco Temple",
          "Subtotal $18.00",
          "Delivery fee $2.99",
          "Taxes $1.58",
          "Tip $4.00",
          "Amount charged: $26.57",
          "Charged to Mastercard ending in 1111",
          "Order #: DD-90210",
        ].join("\n"),
      },
      DoorDashMerchant,
    );

    expect(result).toMatchObject({
      amount: 26.57,
      currency: "USD",
      orderId: "DD-90210",
      restaurant: "Taco Temple",
      description: "DoorDash order - Taco Temple",
    });
  });

  it("handles varied Uber Eats phrasing (subject restaurant + total in body)", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "uber-var-1",
        subject: "Your Uber Eats order from Chipotle",
        body: "Thanks for ordering. Order total $18.75. Paid with Apple Pay.",
      },
      UberEatsMerchant,
    );
    expect(result?.amount).toBe(18.75);
    expect(result?.restaurant).toBe("Chipotle");
  });

  it("extracts DoorDash with 'delivered with DoorDash from' and loose order #", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "dd-var-2",
        subject: "Your order has been delivered",
        body: [
          "Delivered with DoorDash from Shake Shack",
          "Amount charged: $31.40",
          "Order # 9KX-4421",
        ].join("\n"),
      },
      DoorDashMerchant,
    );
    expect(result?.amount).toBe(31.4);
    expect(result?.restaurant?.toLowerCase()).toContain("shake");
    expect(result?.orderId).toBe("9KX-4421");
  });

  it("rejects marketing-ish DoorDash email without strong receipt signals", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "dd-promo",
        subject: "Save $5 on your next DoorDash order",
        body: "Limited time offer - DashPass members only. Use code SAVE5.",
      },
      DoorDashMerchant,
    );
    expect(result).toBeNull();
  });

  it("still extracts when only 'checkout total' and $ is present for Uber", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "uber-co",
        subject: "Uber Eats receipt",
        body: "Checkout total $14.20\nDelivered to 123 Main St",
      },
      UberEatsMerchant,
    );
    expect(result?.amount).toBe(14.2);
  });

  it("falls back to threadId for orderId when no explicit id found", () => {
    const result = fallbackFoodDelivery(
      {
        threadId: "fallback-thread-xyz",
        subject: "Your Uber Eats order from Local Pizza",
        body: "Order total: $22.50",
      },
      UberEatsMerchant,
    );
    expect(result?.orderId).toBe("fallback-thread-xyz");
    expect(result?.amount).toBe(22.5);
  });
});
