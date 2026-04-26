import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db, ensureLocalDatabase } from "../index";
import { transactionsV2 } from "../schema/transactionsV2";
import { profiles } from "../schema/users";
import { getTransactionsEnhancedByUserId } from "./transactionWrites";

describe("transaction write queries", () => {
  it("applies the optional row limit", async () => {
    const userId = `limit-test-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Limit",
      last_name: "Test",
      updated_at: new Date(),
    });
    await db.insert(transactionsV2).values(
      [0, 1, 2].map((daysAgo) => ({
        userId,
        merchantId: "swiggy",
        merchantCode: "SWIGGY",
        merchantName: "Swiggy",
        amount: 100 + daysAgo,
        currency: "INR",
        type: "DEBIT",
        status: "COMPLETED",
        transactionDate: new Date(Date.now() - daysAgo * 86_400_000),
        description: `Limit fixture ${daysAgo}`,
        category: "Food",
        paymentMethod: "UPI",
      })),
    );

    const transactions = await getTransactionsEnhancedByUserId(userId, 2);

    expect(transactions).toHaveLength(2);
  });
});
