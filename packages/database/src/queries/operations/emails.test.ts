import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db, ensureLocalDatabase } from "../../index";
import { transactionsV2 } from "../../schema/transactionsV2";
import { profiles } from "../../schema/users";
import {
  getProcessedEmailIds,
  isEmailProcessed,
  storeEmailData,
} from "./emails";

describe("email processing queries", () => {
  it("treats clean parsed emails as processed even without a transaction", async () => {
    const userId = `email-test-${randomUUID()}`;
    const emailId = `message-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Email",
      last_name: "Test",
      updated_at: new Date(),
    });

    await storeEmailData({
      id: emailId,
      userId,
      senderEmailId: "noreply@swiggy.in",
      threadId: emailId,
      subject: "Swiggy order",
      receivedDate: new Date(),
      parseSuccess: true,
      parseErrors: null,
      rawContent: "raw",
      attachmentStoragePath: null,
      parsedAt: new Date(),
    });

    await expect(isEmailProcessed(userId, emailId)).resolves.toBe(true);
    await expect(getProcessedEmailIds(userId, [emailId])).resolves.toEqual(
      new Set([emailId]),
    );
  });

  it("does not skip rows with parse errors so later syncs can repair them", async () => {
    const userId = `email-error-test-${randomUUID()}`;
    const emailId = `message-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Email",
      last_name: "Error Test",
      updated_at: new Date(),
    });

    await storeEmailData({
      id: emailId,
      userId,
      senderEmailId: "noreply@swiggy.in",
      threadId: emailId,
      subject: "Swiggy order",
      receivedDate: new Date(),
      parseSuccess: true,
      parseErrors: JSON.stringify(["old extractor rejected --email-body"]),
      rawContent: "raw",
      attachmentStoragePath: null,
      parsedAt: new Date(),
    });

    await db.insert(transactionsV2).values({
      userId,
      parsedEmailId: emailId,
      merchantId: "swiggy",
      merchantCode: "SWIGGY",
      merchantName: "Swiggy",
      amount: 123,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: new Date(),
      description: "Swiggy order",
      category: "Food",
      paymentMethod: "UPI",
    });

    await expect(isEmailProcessed(userId, emailId)).resolves.toBe(false);
    await expect(getProcessedEmailIds(userId, [emailId])).resolves.toEqual(
      new Set(),
    );
  });

  it("reuses an existing parsed email row when the thread id already exists", async () => {
    const userId = `email-thread-test-${randomUUID()}`;
    const originalId = `message-${randomUUID()}`;
    const replacementId = `message-${randomUUID()}`;
    const threadId = `thread-${randomUUID()}`;
    ensureLocalDatabase();
    await db.insert(profiles).values({
      id: userId,
      email: null,
      first_name: "Email",
      last_name: "Thread Test",
      updated_at: new Date(),
    });

    await storeEmailData({
      id: originalId,
      userId,
      senderEmailId: "noreply@swiggy.in",
      threadId,
      subject: "Swiggy order original",
      receivedDate: new Date(),
      parseSuccess: true,
      parseErrors: null,
      rawContent: "raw",
      attachmentStoragePath: null,
      parsedAt: new Date(),
    });

    const updated = await storeEmailData({
      id: replacementId,
      userId,
      senderEmailId: "noreply@swiggy.in",
      threadId,
      subject: "Swiggy order reextracted",
      receivedDate: new Date(),
      parseSuccess: true,
      parseErrors: null,
      rawContent: "updated raw",
      attachmentStoragePath: ["/tmp/invoice.pdf"],
      parsedAt: new Date(),
    });

    expect(updated[0]?.id).toBe(originalId);
    expect(updated[0]?.subject).toBe("Swiggy order reextracted");
  });
});
