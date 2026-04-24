import { describe, expect, it } from "vitest";
import { fallbackSwiggy } from "./body-fallback";

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
