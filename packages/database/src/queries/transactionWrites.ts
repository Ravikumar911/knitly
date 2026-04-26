import { eq, and, desc, inArray } from "drizzle-orm";
import { db, Transaction } from "../";
import { transactionsV2 } from "../schema/transactionsV2";

export interface TransactionV2Input {
  userId: string;
  parsedEmailId?: string;
  merchantId?: string;
  merchantCode?: string;
  merchantName?: string;
  amount: number;
  currency?: string;
  type: "DEBIT" | "CREDIT";
  status?: string;
  transactionDate: Date;
  description?: string;
  category?: string;
  paymentMethod?: string;
  referenceIds?: Record<string, any>;
  location?: Record<string, any>;
  merchantData?: Record<string, any>;
  extractionConfidence?: number;
  schemaUsed?: string;
  dataSource?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  duplicateOf?: string;
}

function toTransactionV2Values(transaction: TransactionV2Input) {
  return {
    userId: transaction.userId,
    parsedEmailId: transaction.parsedEmailId || null,
    merchantId: transaction.merchantId || null,
    merchantCode: transaction.merchantCode || null,
    merchantName: transaction.merchantName || null,
    amount: transaction.amount,
    currency: transaction.currency || "INR",
    type: transaction.type,
    status: transaction.status || "COMPLETED",
    transactionDate: transaction.transactionDate,
    description: transaction.description || null,
    category: transaction.category || null,
    paymentMethod: transaction.paymentMethod || null,
    referenceIds: transaction.referenceIds || {},
    location: transaction.location || null,
    merchantData: transaction.merchantData || {},
    extractionConfidence: transaction.extractionConfidence || null,
    schemaUsed: transaction.schemaUsed || null,
    dataSource: transaction.dataSource || null,
    isVerified: transaction.isVerified ?? false,
    verificationStatus: transaction.verificationStatus ?? "UNVERIFIED",
    duplicateOf: transaction.duplicateOf || null,
  };
}

/**
 * Store a transaction in the v2 table using input data.
 *
 * Sync retries re-use a parsed email id, so keep one transaction row per parsed
 * email and update it when better extraction data arrives.
 */
export async function storeTransactionV2Input(transaction: TransactionV2Input) {
  const values = toTransactionV2Values(transaction);

  if (transaction.parsedEmailId) {
    const existing = await db
      .select({
        id: transactionsV2.id,
        isVerified: transactionsV2.isVerified,
        verificationStatus: transactionsV2.verificationStatus,
      })
      .from(transactionsV2)
      .where(
        and(
          eq(transactionsV2.userId, transaction.userId),
          eq(transactionsV2.parsedEmailId, transaction.parsedEmailId),
        ),
      )
      .orderBy(desc(transactionsV2.updatedAt));

    const [primary, ...duplicates] = existing;
    if (primary) {
      const duplicateIds = duplicates.map((row) => row.id);
      if (duplicateIds.length > 0) {
        await db
          .delete(transactionsV2)
          .where(inArray(transactionsV2.id, duplicateIds));
      }

      const result = await db
        .update(transactionsV2)
        .set({
          ...values,
          isVerified: transaction.isVerified ?? primary.isVerified ?? false,
          verificationStatus:
            transaction.verificationStatus ??
            primary.verificationStatus ??
            "UNVERIFIED",
          updatedAt: new Date(),
        })
        .where(eq(transactionsV2.id, primary.id))
        .returning();

      return result[0];
    }
  }

  const result = await db.insert(transactionsV2).values(values).returning();

  return result[0];
}

/**
 * Store a new transaction in the v2 table
 */
export async function storeTransactionV2(transaction: Transaction) {
  const result = await db
    .insert(transactionsV2)
    .values({
      userId: transaction.userId,
      parsedEmailId: transaction.parsedEmailId || null,
      merchantId: transaction.merchantId || null,
      merchantCode: transaction.merchantCode || null,
      merchantName: transaction.merchantName || null,
      amount: Number(transaction.amount),
      currency: transaction.currency || "INR",
      type: transaction.type,
      status: transaction.status || "COMPLETED",
      transactionDate: transaction.transactionDate,
      description: transaction.description || null,
      category: transaction.category || null,
      paymentMethod: transaction.paymentMethod || null,
      referenceIds: transaction.referenceIds || {},
      location: transaction.location || null,
      merchantData: transaction.merchantData || {},
      extractionConfidence: transaction.extractionConfidence || null,
      schemaUsed: transaction.schemaUsed || null,
      dataSource: transaction.dataSource || null,
      isVerified: transaction.isVerified || false,
      verificationStatus: transaction.verificationStatus || "UNVERIFIED",
      duplicateOf: transaction.duplicateOf || null,
    })
    .returning();

  return result[0];
}

/**
 * Get transactions for a user
 */
export async function getTransactionsEnhancedByUserId(
  userId: string,
  limit?: number,
) {
  const query = db
    .select()
    .from(transactionsV2)
    .where(eq(transactionsV2.userId, userId))
    .orderBy(desc(transactionsV2.transactionDate));

  if (limit) {
    return query.limit(limit);
  }

  return query;
}

/**
 * Get transactions by merchant
 */
export async function getTransactionsEnhancedByMerchant(
  userId: string,
  merchantId: string,
) {
  return db
    .select()
    .from(transactionsV2)
    .where(
      and(
        eq(transactionsV2.userId, userId),
        eq(transactionsV2.merchantId, merchantId),
      ),
    )
    .orderBy(desc(transactionsV2.transactionDate));
}

/**
 * Get transaction by ID
 */
export async function getTransactionEnhancedById(transactionId: string) {
  const result = await db
    .select()
    .from(transactionsV2)
    .where(eq(transactionsV2.id, transactionId))
    .limit(1);

  return result[0] || null;
}

/**
 * Update transaction verification status
 */
export async function updateTransactionEnhancedVerification(
  transactionId: string,
  isVerified: boolean,
  verificationStatus: string,
) {
  const result = await db
    .update(transactionsV2)
    .set({
      isVerified,
      verificationStatus,
      updatedAt: new Date(),
    })
    .where(eq(transactionsV2.id, transactionId))
    .returning();

  return result[0];
}

/**
 * Mark transaction as duplicate
 */
export async function markTransactionEnhancedAsDuplicate(
  transactionId: string,
  duplicateOfId: string,
) {
  const result = await db
    .update(transactionsV2)
    .set({
      duplicateOf: duplicateOfId,
      updatedAt: new Date(),
    })
    .where(eq(transactionsV2.id, transactionId))
    .returning();

  return result[0];
}
