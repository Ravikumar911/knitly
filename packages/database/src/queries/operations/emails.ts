import { db } from "../../index";
import { parsedEmails } from "../../schema/parsedEmails";
import { transactionsV2 } from "../../schema/transactionsV2";
import { eq, and, or, inArray } from "drizzle-orm";
import { ParsedEmail } from "../../types";
/**
 * Stores processed email data in the database
 */
export async function storeEmailData(
  data: Omit<ParsedEmail, "id" | "createdAt" | "updatedAt"> & { id?: string },
) {
  const now = new Date();
  const values = {
    id: data.id,
    userId: data.userId,
    senderEmailId: data.senderEmailId,
    threadId: data.threadId,
    subject: data.subject,
    receivedDate: data.receivedDate,
    parseSuccess: data.parseSuccess,
    parseErrors: data.parseErrors,
    rawContent: data.rawContent,
    attachmentStoragePath: data.attachmentStoragePath,
    parsedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  return await db
    .insert(parsedEmails)
    .values(values)
    .onConflictDoUpdate({
      target: parsedEmails.id,
      set: {
        userId: values.userId,
        senderEmailId: values.senderEmailId,
        threadId: values.threadId,
        subject: values.subject,
        receivedDate: values.receivedDate,
        parseSuccess: values.parseSuccess,
        parseErrors: values.parseErrors,
        rawContent: values.rawContent,
        attachmentStoragePath: values.attachmentStoragePath,
        parsedAt: values.parsedAt,
        updatedAt: values.updatedAt,
      },
    })
    .returning();
}

/**
 * Updates an existing email record
 */
export async function updateEmailData(
  emailId: string,
  data: Partial<Omit<ParsedEmail, "id" | "createdAt" | "updatedAt">>,
) {
  return await db
    .update(parsedEmails)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(parsedEmails.id, emailId))
    .returning();
}

/**
 * Checks if an email has already been processed
 */
export async function isEmailProcessed(userId: string, messageId: string) {
  const result = await db
    .select({ id: parsedEmails.id })
    .from(parsedEmails)
    .innerJoin(
      transactionsV2,
      eq(transactionsV2.parsedEmailId, parsedEmails.id),
    )
    .where(
      and(
        eq(parsedEmails.userId, userId),
        eq(parsedEmails.parseSuccess, true),
        or(
          eq(parsedEmails.id, messageId),
          eq(parsedEmails.threadId, messageId),
        ),
      ),
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Bulk variant used by the staged sync runner to avoid one query per message.
 */
export async function getProcessedEmailIds(
  userId: string,
  messageIds: string[],
) {
  const uniqueIds = [...new Set(messageIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Set<string>();

  const result = await db
    .select({
      id: parsedEmails.id,
      threadId: parsedEmails.threadId,
    })
    .from(parsedEmails)
    .innerJoin(
      transactionsV2,
      eq(transactionsV2.parsedEmailId, parsedEmails.id),
    )
    .where(
      and(
        eq(parsedEmails.userId, userId),
        eq(parsedEmails.parseSuccess, true),
        or(
          inArray(parsedEmails.id, uniqueIds),
          inArray(parsedEmails.threadId, uniqueIds),
        ),
      ),
    );

  return new Set(
    result.flatMap((row) => [row.id, row.threadId].filter(Boolean) as string[]),
  );
}
