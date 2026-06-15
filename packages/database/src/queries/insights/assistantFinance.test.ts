import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db, ensureLocalDatabase } from "../../index";
import { transactionsV2 } from "../../schema/transactionsV2";
import { profiles } from "../../schema/users";
import { getAssistantFinanceSnapshot } from "./assistantFinance";

describe("assistant finance snapshot", () => {
  it("summarizes arbitrary merchants with the same normalized transaction shape", async () => {
    const userId = `assistant-finance-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Assistant",
      last_name: "Finance",
      updated_at: new Date(),
    });

    await db.insert(transactionsV2).values([
      fixtureTransaction({
        userId,
        merchantId: "merchant-alpha",
        merchantName: "Merchant Alpha",
        amount: 420,
        date: new Date("2026-04-04T19:30:00"),
        serviceType: "FOOD_DELIVERY",
        counterparty: "Noodle House",
        orderId: "alpha-1",
        paymentMethod: "UPI",
        items: [{ name: "Dan Dan Noodles", quantity: 1, price: 360 }],
        deliveryFee: 32,
        discount: 50,
      }),
      fixtureTransaction({
        userId,
        merchantId: "merchant-alpha",
        merchantName: "Merchant Alpha",
        amount: 260,
        date: new Date("2026-04-08T09:15:00"),
        serviceType: "GROCERY",
        counterparty: "Fresh Basket",
        orderId: "alpha-2",
        paymentMethod: "Card",
        items: [
          { name: "Milk", quantity: 2, price: 35 },
          { name: "Bananas", quantity: 1, price: 80 },
        ],
      }),
      fixtureTransaction({
        userId,
        merchantId: "merchant-beta",
        merchantName: "Merchant Beta",
        amount: 900,
        date: new Date("2026-04-12T21:00:00"),
        serviceType: "DINING_OUT",
        counterparty: "Table Bistro",
        orderId: "beta-1",
        paymentMethod: "Card",
        discount: 120,
      }),
    ]);

    const alpha = await getAssistantFinanceSnapshot(userId, {
      merchantIds: ["merchant-alpha"],
      startDate: new Date("2026-04-01T00:00:00"),
      endDate: new Date("2026-04-30T23:59:59.999"),
      serviceTypes: ["foodDelivery"],
      includeOrders: true,
    });

    expect(alpha.totals).toMatchObject({
      spend: 420,
      count: 1,
      averageOrderValue: 420,
    });
    expect(alpha.serviceBreakdown).toEqual([
      {
        serviceType: "foodDelivery",
        label: "Food delivery",
        count: 1,
        spend: 420,
      },
    ]);
    expect(alpha.merchantBreakdown[0]).toMatchObject({
      merchantId: "merchant-alpha",
      name: "Noodle House",
      count: 1,
      spend: 420,
    });
    expect(alpha.itemBreakdown[0]).toMatchObject({
      name: "Dan Dan Noodles",
      quantity: 1,
      count: 1,
      spend: 360,
    });
    expect(alpha.feeSummary).toMatchObject({
      totalDeliveryFee: 32,
      averageDeliveryFee: 32,
      totalDiscount: 50,
      averageDiscount: 50,
    });
    expect(alpha.recentOrders[0]).toMatchObject({
      merchantId: "merchant-alpha",
      merchantName: "Noodle House",
      serviceType: "foodDelivery",
      orderId: "alpha-1",
    });

    const allMerchants = await getAssistantFinanceSnapshot(userId, {
      startDate: new Date("2026-04-01T00:00:00"),
      endDate: new Date("2026-04-30T23:59:59.999"),
    });

    expect(allMerchants.totals).toMatchObject({
      spend: 1580,
      count: 3,
    });
    expect(
      allMerchants.serviceBreakdown.map((item) => item.serviceType),
    ).toEqual(["foodDelivery", "grocery", "dineout"]);
  });

  it("matches merchant ids without depending on brand-specific aliases", async () => {
    const userId = `assistant-finance-alias-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Alias",
      last_name: "Finance",
      updated_at: new Date(),
    });

    await db.insert(transactionsV2).values(
      fixtureTransaction({
        userId,
        merchantId: "merchantalpha",
        merchantName: "Merchant Alpha",
        amount: 100,
        date: new Date("2026-04-04T19:30:00"),
        serviceType: "FOOD_DELIVERY",
        counterparty: "Noodle House",
        orderId: "alpha-3",
      }),
    );

    const snapshot = await getAssistantFinanceSnapshot(userId, {
      merchantIds: ["merchant-alpha"],
    });

    expect(snapshot.totals.count).toBe(1);
    expect(snapshot.recentOrders[0]?.merchantId).toBe("merchantalpha");
  });

  it("recentOnly returns the latest N orders without a date window", async () => {
    const userId = `assistant-finance-recent-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Recent",
      last_name: "Finance",
      updated_at: new Date(),
    });

    const rows = Array.from({ length: 12 }, (_, index) =>
      fixtureTransaction({
        userId,
        merchantId: "merchant-alpha",
        merchantName: "Merchant Alpha",
        amount: 100 + index,
        date: new Date(
          `2026-04-${String(index + 1).padStart(2, "0")}T12:00:00`,
        ),
        serviceType: "FOOD_DELIVERY",
        counterparty: `Order ${index + 1}`,
        orderId: `recent-${index + 1}`,
      }),
    );
    await db.insert(transactionsV2).values(rows);

    const snapshot = await getAssistantFinanceSnapshot(userId, {
      recentOnly: true,
      recentOrderLimit: 10,
      includeOrders: true,
      limit: 10,
    });

    expect(snapshot.totals.count).toBe(10);
    expect(snapshot.recentOrders).toHaveLength(10);
    expect(snapshot.recentOrders[0]?.orderId).toBe("recent-12");
    expect(snapshot.recentOrders[9]?.orderId).toBe("recent-3");
  });

  it("classifies uber-eats and doordash style merchantData (from generic food delivery fallback) as foodDelivery", async () => {
    const userId = `assistant-uber-flow-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Test",
      last_name: "UberFlow",
      updated_at: new Date(),
    });

    await db.insert(transactionsV2).values([
      // Shape produced by pipeline + fallbackFoodDelivery for uber-eats / doordash
      {
        userId,
        merchantId: "uber-eats",
        merchantCode: "UBER_EATS",
        merchantName: "Uber Eats",
        amount: 27.4,
        currency: "USD",
        type: "DEBIT",
        status: "COMPLETED",
        transactionDate: new Date("2026-04-10T12:00:00"),
        description: "Uber Eats order - Sweetgreen",
        category: "Food",
        paymentMethod: "Visa",
        referenceIds: { orderId: "uber-12345" },
        merchantData: {
          detectedProvider: "Uber Eats",
          emailType: "ORDER_CONFIRMATION",
          foodDeliveryMetadata: {
            service: "FOOD_DELIVERY",
            fulfillmentType: "DELIVERY",
          },
          transaction: {
            amount: 27.4,
            currency: "USD",
            restaurantName: "Sweetgreen",
            orderId: "uber-12345",
            orderItems: [],
          },
        },
      },
      {
        userId,
        merchantId: "doordash",
        merchantCode: "DOORDASH",
        merchantName: "DoorDash",
        amount: 15.9,
        currency: "USD",
        type: "DEBIT",
        status: "COMPLETED",
        transactionDate: new Date("2026-04-11T19:30:00"),
        description: "DoorDash order - Taco Temple",
        category: "Food",
        merchantData: {
          foodDeliveryMetadata: { service: "FOOD_DELIVERY" },
          transaction: { restaurantName: "Taco Temple" },
        },
      },
    ]);

    const snap = await getAssistantFinanceSnapshot(userId, {
      merchantIds: ["uber-eats", "doordash"],
      includeOrders: true,
    });

    expect(snap.totals.count).toBe(2);
    expect(snap.totals.spend).toBeCloseTo(43.3);
    expect(snap.serviceBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ serviceType: "foodDelivery", count: 2 }),
      ]),
    );
    expect(snap.recentOrders[0]?.merchantId).toBe("doordash");
    expect(snap.recentOrders[0]?.serviceType).toBe("foodDelivery");
    expect(snap.recentOrders[1]?.merchantName).toBe("Sweetgreen");
  });
});

function fixtureTransaction(input: {
  userId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  date: Date;
  serviceType: string;
  counterparty: string;
  orderId: string;
  paymentMethod?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  deliveryFee?: number;
  discount?: number;
}) {
  return {
    userId: input.userId,
    merchantId: input.merchantId,
    merchantCode: input.merchantId.toUpperCase(),
    merchantName: input.merchantName,
    amount: input.amount,
    currency: "INR",
    type: "DEBIT",
    status: "COMPLETED",
    transactionDate: input.date,
    description: `${input.merchantName} order from ${input.counterparty}`,
    category: "Food",
    paymentMethod: input.paymentMethod ?? "UPI",
    merchantData: {
      serviceType: input.serviceType,
      transaction: {
        orderId: input.orderId,
        merchantName: input.counterparty,
        orderItems: input.items ?? [],
        deliveryFee: input.deliveryFee,
        discount: input.discount,
      },
    },
  };
}
