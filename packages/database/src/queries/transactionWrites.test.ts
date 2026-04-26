import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db, ensureLocalDatabase } from "../index";
import { parsedEmails } from "../schema/parsedEmails";
import { transactionsV2 } from "../schema/transactionsV2";
import { profiles } from "../schema/users";
import {
  getTransactionsEnhancedByUserId,
  storeTransactionV2Input,
} from "./transactionWrites";

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

  it("updates the transaction for an existing parsed email instead of duplicating it", async () => {
    const userId = `replace-test-${randomUUID()}`;
    const parsedEmailId = `message-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Replace",
      last_name: "Test",
      updated_at: new Date(),
    });
    await db.insert(parsedEmails).values({
      id: parsedEmailId,
      userId,
      senderEmailId: "noreply@swiggy.in",
      threadId: parsedEmailId,
      subject: "Swiggy order",
      receivedDate: new Date(),
      parseSuccess: true,
      parseErrors: null,
      rawContent: "raw",
    });

    const first = await storeTransactionV2Input({
      userId,
      parsedEmailId,
      merchantId: "swiggy",
      merchantCode: "SWIGGY",
      merchantName: "Swiggy",
      amount: 100,
      type: "DEBIT",
      transactionDate: new Date(),
      isVerified: true,
      verificationStatus: "VERIFIED",
    });
    const second = await storeTransactionV2Input({
      userId,
      parsedEmailId,
      merchantId: "swiggy",
      merchantCode: "SWIGGY",
      merchantName: "Swiggy",
      amount: 250,
      type: "DEBIT",
      transactionDate: new Date(),
      schemaUsed: "swiggy.deterministic.v1",
      dataSource: "PDF",
    });

    const rows = await db
      .select()
      .from(transactionsV2)
      .where(eq(transactionsV2.parsedEmailId, parsedEmailId));

    expect(second?.id).toBe(first?.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      amount: 250,
      isVerified: true,
      verificationStatus: "VERIFIED",
      schemaUsed: "swiggy.deterministic.v1",
      dataSource: "PDF",
    });
  });
});
