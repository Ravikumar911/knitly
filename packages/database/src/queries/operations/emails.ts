import { db } from '../../index';
import { parsedEmails } from '../../schema/parsedEmails';
import { transactions } from '../../schema/transactions';
import { eq, and } from 'drizzle-orm';
import { ParsedEmail } from '../../types';

export interface StoredTransactionData {
  userId: string;
  parsedEmailId: string;
  amount: number;
  currency: string;
  type: string;
  transactionDate: Date;
  description?: string;
  upiReferenceId?: string;
  upiTransactionId?: string;
  counterpartyUpiHandle?: string;
  isRecurring: boolean;
}

/**
 * Stores processed email data in the database
 */
export async function storeEmailData(data: Omit<ParsedEmail, 'id' | 'createdAt' | 'updatedAt'>) {
  return await db.insert(parsedEmails).values({
    messageId: data.messageId,
    userId: data.userId,
    senderEmailId: data.senderEmailId,
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
 * Stores transaction data extracted from emails
 */
export async function storeTransactionData(data: StoredTransactionData) {
  return await db.insert(transactions).values({
    userId: data.userId,
    parsedEmailId: data.parsedEmailId,
    amount: data.amount,
    currency: data.currency,
    type: data.type,
    transactionDate: data.transactionDate,
    description: data.description,
    upiReferenceId: data.upiReferenceId,
    upiTransactionId: data.upiTransactionId,
    counterpartyUpiHandle: data.counterpartyUpiHandle,
    isRecurring: data.isRecurring,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
}

/**
 * Checks if an email has already been processed
 */
export async function isEmailProcessed(userId: string, messageId: string) {
  const result = await db.select({ id: parsedEmails.id })
    .from(parsedEmails)
    .where(and(
      eq(parsedEmails.userId, userId),
      eq(parsedEmails.messageId, messageId)
    ))
    .limit(1);
  
  return result.length > 0;
} 