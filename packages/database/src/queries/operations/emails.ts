import { db } from '../../index';
import { parsedEmails } from '../../schema/parsedEmails';
import { eq, and } from 'drizzle-orm';
import { ParsedEmail } from '../../types';
/**
 * Stores processed email data in the database
 */
export async function storeEmailData(data: Omit<ParsedEmail, 'id' | 'createdAt' | 'updatedAt'>) {
  return await db.insert(parsedEmails).values({
    userId: data.userId,
    senderEmailId: data.senderEmailId,
    threadId: data.threadId,
    subject: data.subject,
    receivedDate: data.receivedDate,
    parseSuccess: data.parseSuccess,
    parseErrors: data.parseErrors,
    rawContent: data.rawContent,
    attachmentStoragePath: data.attachmentStoragePath,
    parsedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
}

/**
 * Updates an existing email record
 */
export async function updateEmailData(emailId: string, data: Partial<Omit<ParsedEmail, 'id' | 'createdAt' | 'updatedAt'>>) {
  return await db.update(parsedEmails)
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
  const result = await db.select({ id: parsedEmails.id })
    .from(parsedEmails)
    .where(and(
      eq(parsedEmails.userId, userId),
      eq(parsedEmails.threadId, messageId)
    ))
    .limit(1);
  
  return result.length > 0;
} 