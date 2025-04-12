import { db } from '../../index';
import { parsedEmails } from '../../schema/parsedEmails';
import { transactions } from '../../schema/transactions';
import { eq, and } from 'drizzle-orm';
import { ParsedEmail, Transaction } from '../../types';
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
 * Stores transaction data extracted from emails
 */
export async function storeTransactionData(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
  return await db.insert(transactions).values({
    userId: data.userId,
    parsedEmailId: data.parsedEmailId,
    amount: data.amount,
    currency: data.currency,
    type: data.type,
    status: data.status,
    transactionDate: data.transactionDate,
    valueDate: data.valueDate,
    description: data.description,
    notes: data.notes,
    category: data.category,
    merchantId: data.merchantId,
    merchantName: data.merchantName,
    merchantCategory: data.merchantCategory,
    instrumentId: data.instrumentId,
    orderId: data.orderId,
    orderItems: data.orderItems,
    deliveryAddress: data.deliveryAddress,
    paymentMethod: data.paymentMethod,
    referenceIds: data.referenceIds,
    location: data.location,
    isVerified: data.isVerified,
    verificationStatus: data.verificationStatus,
    aiAnalysisId: data.aiAnalysisId,
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
      eq(parsedEmails.threadId, messageId)
    ))
    .limit(1);
  
  return result.length > 0;
} 