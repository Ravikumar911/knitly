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
});
