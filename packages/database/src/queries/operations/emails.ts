import { db } from '@/src/index';
import { parsedEmails } from '@/src/schema/parsedEmails';
import { transactions } from '@/src/schema/transactions';
import { eq, and } from 'drizzle-orm';

export interface StoredEmailData {
  messageId: string;
  userId: string;
  threadId?: string;
  subject: string;
  sender: string;
  receivedDate: Date;
  detectedProvider?: string;
  emailType?: string;
  parseSuccess: boolean;
  parseErrors?: string;
  rawContent: string;
  attachmentStoragePath?: string;
}

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
export async function storeEmailData(data: StoredEmailData) {
  return await db.insert(parsedEmails).values({
    userId: data.userId,
    emailId: data.messageId,
    subject: data.subject,
    sender: data.sender,
    receivedDate: data.receivedDate,
    detectedProvider: data.detectedProvider,
    emailType: data.emailType,
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
      eq(parsedEmails.emailId, messageId)
    ))
    .limit(1);
  
  return result.length > 0;
} 