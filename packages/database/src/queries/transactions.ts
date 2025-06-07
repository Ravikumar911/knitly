import { eq, and, desc, ilike, sql, isNotNull } from "drizzle-orm";
import { db } from "../";
import { transactionsV2 } from "../schema/transactionsV2";
import { parsedEmails } from "../schema/parsedEmails";

export interface TransactionWithEmail {
  id: string;
  userId: string;
  parsedEmailId: string | null;
  merchantId: string | null;
  merchantCode: string | null;
  merchantName: string | null;
  amount: string;
  currency: string | null;
  type: string;
  status: string | null;
  transactionDate: Date;
  description: string | null;
  category: string | null;
  paymentMethod: string | null;
  referenceIds: any;
  location: any;
  merchantData: any;
  extractionConfidence: number | null;
  schemaUsed: string | null;
  dataSource: string | null;
  isVerified: boolean | null;
  verificationStatus: string | null;
  duplicateOf: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Email data
  emailId: string | null;
  emailSubject: string | null;
  emailSnippet: string | null;
  emailThreadId: string | null;
  attachmentStoragePath: any;
  emailReceivedDate: Date | null;
}

export interface TransactionFilters {
  merchantId?: string;
  merchantName?: string;
  status?: string;
  type?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Get transactions with email data for a user with filtering options
 */
export async function getTransactionsWithEmails(
  userId: string,
  filters?: TransactionFilters,
  limit: number = 50,
  offset: number = 0
) {
  // Build conditions array
  const conditions: any[] = [eq(transactionsV2.userId, userId)];

  if (filters?.merchantId) {
    conditions.push(eq(transactionsV2.merchantId, filters.merchantId));
  }

  if (filters?.merchantName) {
    conditions.push(ilike(transactionsV2.merchantName, `%${filters.merchantName}%`));
  }

  if (filters?.status) {
    conditions.push(eq(transactionsV2.status, filters.status));
  }

  if (filters?.type) {
    conditions.push(eq(transactionsV2.type, filters.type));
  }

  if (filters?.category) {
    conditions.push(eq(transactionsV2.category, filters.category));
  }

  if (filters?.startDate) {
    conditions.push(sql`${transactionsV2.transactionDate} >= ${filters.startDate}`);
  }

  if (filters?.endDate) {
    conditions.push(sql`${transactionsV2.transactionDate} <= ${filters.endDate}`);
  }

  if (filters?.searchQuery) {
    conditions.push(
      sql`(
        ${transactionsV2.description} ILIKE ${`%${filters.searchQuery}%`} OR
        ${transactionsV2.merchantName} ILIKE ${`%${filters.searchQuery}%`} OR
        ${parsedEmails.subject} ILIKE ${`%${filters.searchQuery}%`}
      )`
    );
  }

  const result = await db
    .select({
      // Transaction fields
      id: transactionsV2.id,
      userId: transactionsV2.userId,
      parsedEmailId: transactionsV2.parsedEmailId,
      merchantId: transactionsV2.merchantId,
      merchantCode: transactionsV2.merchantCode,
      merchantName: transactionsV2.merchantName,
      amount: transactionsV2.amount,
      currency: transactionsV2.currency,
      type: transactionsV2.type,
      status: transactionsV2.status,
      transactionDate: transactionsV2.transactionDate,
      description: transactionsV2.description,
      category: transactionsV2.category,
      paymentMethod: transactionsV2.paymentMethod,
      referenceIds: transactionsV2.referenceIds,
      location: transactionsV2.location,
      merchantData: transactionsV2.merchantData,
      extractionConfidence: transactionsV2.extractionConfidence,
      schemaUsed: transactionsV2.schemaUsed,
      dataSource: transactionsV2.dataSource,
      isVerified: transactionsV2.isVerified,
      verificationStatus: transactionsV2.verificationStatus,
      duplicateOf: transactionsV2.duplicateOf,
      createdAt: transactionsV2.createdAt,
      updatedAt: transactionsV2.updatedAt,
      // Email fields
      emailId: parsedEmails.id,
      emailSubject: parsedEmails.subject,
      emailSnippet: parsedEmails.snippet,
      emailThreadId: parsedEmails.threadId,
      attachmentStoragePath: parsedEmails.attachmentStoragePath,
      emailReceivedDate: parsedEmails.receivedDate,
    })
    .from(transactionsV2)
    .leftJoin(parsedEmails, eq(transactionsV2.parsedEmailId, parsedEmails.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(transactionsV2.transactionDate))
    .limit(limit)
    .offset(offset);

  return result as TransactionWithEmail[];
}

/**
 * Get transaction count with filters for pagination
 */
export async function getTransactionsCount(userId: string, filters?: TransactionFilters) {
  const conditions: any[] = [eq(transactionsV2.userId, userId)];

  if (filters?.merchantId) {
    conditions.push(eq(transactionsV2.merchantId, filters.merchantId));
  }

  if (filters?.merchantName) {
    conditions.push(ilike(transactionsV2.merchantName, `%${filters.merchantName}%`));
  }

  if (filters?.status) {
    conditions.push(eq(transactionsV2.status, filters.status));
  }

  if (filters?.type) {
    conditions.push(eq(transactionsV2.type, filters.type));
  }

  if (filters?.category) {
    conditions.push(eq(transactionsV2.category, filters.category));
  }

  if (filters?.startDate) {
    conditions.push(sql`${transactionsV2.transactionDate} >= ${filters.startDate}`);
  }

  if (filters?.endDate) {
    conditions.push(sql`${transactionsV2.transactionDate} <= ${filters.endDate}`);
  }

  if (filters?.searchQuery) {
    conditions.push(
      sql`(
        ${transactionsV2.description} ILIKE ${`%${filters.searchQuery}%`} OR
        ${transactionsV2.merchantName} ILIKE ${`%${filters.searchQuery}%`}
      )`
    );
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsV2)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions));

  return result[0]?.count || 0;
}

/**
 * Get unique merchants for a user (for filter dropdown)
 */
export async function getUserMerchants(userId: string) {
  const result = await db
    .select({
      merchantId: transactionsV2.merchantId,
      merchantName: transactionsV2.merchantName,
      merchantCode: transactionsV2.merchantCode,
      transactionCount: sql<number>`count(*)`,
    })
    .from(transactionsV2)
    .where(and(
      eq(transactionsV2.userId, userId),
      isNotNull(transactionsV2.merchantId)
    ))
    .groupBy(transactionsV2.merchantId, transactionsV2.merchantName, transactionsV2.merchantCode)
    .orderBy(desc(sql`count(*)`));

  return result;
}

/**
 * Get a specific transaction with email data
 */
export async function getTransactionWithEmail(transactionId: string, userId: string) {
  const result = await db
    .select({
      // Transaction fields
      id: transactionsV2.id,
      userId: transactionsV2.userId,
      parsedEmailId: transactionsV2.parsedEmailId,
      merchantId: transactionsV2.merchantId,
      merchantCode: transactionsV2.merchantCode,
      merchantName: transactionsV2.merchantName,
      amount: transactionsV2.amount,
      currency: transactionsV2.currency,
      type: transactionsV2.type,
      status: transactionsV2.status,
      transactionDate: transactionsV2.transactionDate,
      description: transactionsV2.description,
      category: transactionsV2.category,
      paymentMethod: transactionsV2.paymentMethod,
      referenceIds: transactionsV2.referenceIds,
      location: transactionsV2.location,
      merchantData: transactionsV2.merchantData,
      extractionConfidence: transactionsV2.extractionConfidence,
      schemaUsed: transactionsV2.schemaUsed,
      dataSource: transactionsV2.dataSource,
      isVerified: transactionsV2.isVerified,
      verificationStatus: transactionsV2.verificationStatus,
      duplicateOf: transactionsV2.duplicateOf,
      createdAt: transactionsV2.createdAt,
      updatedAt: transactionsV2.updatedAt,
      // Email fields
      emailId: parsedEmails.id,
      emailSubject: parsedEmails.subject,
      emailSnippet: parsedEmails.snippet,
      emailThreadId: parsedEmails.threadId,
      attachmentStoragePath: parsedEmails.attachmentStoragePath,
      emailReceivedDate: parsedEmails.receivedDate,
    })
    .from(transactionsV2)
    .leftJoin(parsedEmails, eq(transactionsV2.parsedEmailId, parsedEmails.id))
    .where(and(
      eq(transactionsV2.id, transactionId),
      eq(transactionsV2.userId, userId)
    ))
    .limit(1);

  return result[0] as TransactionWithEmail | undefined;
}

/**
 * Get transactions with attachment information
 */
export async function getTransactionsWithAttachments(
  userId: string,
  filters?: TransactionFilters,
  limit: number = 50,
  offset: number = 0
) {
  // Build conditions array
  const conditions: any[] = [eq(transactionsV2.userId, userId)];

  if (filters) {
    if (filters.merchantId) {
      conditions.push(eq(transactionsV2.merchantId, filters.merchantId));
    }
    if (filters.type) {
      conditions.push(eq(transactionsV2.type, filters.type));
    }
    if (filters.category) {
      conditions.push(eq(transactionsV2.category, filters.category));
    }
    if (filters.startDate) {
      conditions.push(sql`${transactionsV2.transactionDate} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${transactionsV2.transactionDate} <= ${filters.endDate}`);
    }
    if (filters.minAmount !== undefined) {
      conditions.push(sql`CAST(${transactionsV2.amount} AS DECIMAL) >= ${filters.minAmount}`);
    }
    if (filters.maxAmount !== undefined) {
      conditions.push(sql`CAST(${transactionsV2.amount} AS DECIMAL) <= ${filters.maxAmount}`);
    }
  }

  // Only get transactions with email attachments
  conditions.push(isNotNull(parsedEmails.attachmentStoragePath));

  const result = await db
    .select({
      // Transaction fields
      id: transactionsV2.id,
      userId: transactionsV2.userId,
      parsedEmailId: transactionsV2.parsedEmailId,
      merchantId: transactionsV2.merchantId,
      merchantCode: transactionsV2.merchantCode,
      merchantName: transactionsV2.merchantName,
      amount: transactionsV2.amount,
      currency: transactionsV2.currency,
      type: transactionsV2.type,
      status: transactionsV2.status,
      transactionDate: transactionsV2.transactionDate,
      description: transactionsV2.description,
      category: transactionsV2.category,
      paymentMethod: transactionsV2.paymentMethod,
      referenceIds: transactionsV2.referenceIds,
      location: transactionsV2.location,
      merchantData: transactionsV2.merchantData,
      extractionConfidence: transactionsV2.extractionConfidence,
      schemaUsed: transactionsV2.schemaUsed,
      dataSource: transactionsV2.dataSource,
      isVerified: transactionsV2.isVerified,
      verificationStatus: transactionsV2.verificationStatus,
      duplicateOf: transactionsV2.duplicateOf,
      createdAt: transactionsV2.createdAt,
      updatedAt: transactionsV2.updatedAt,
      // Email attachment fields
      emailId: parsedEmails.id,
      emailSubject: parsedEmails.subject,
      emailSnippet: parsedEmails.snippet,
      emailThreadId: parsedEmails.threadId,
      attachmentStoragePath: parsedEmails.attachmentStoragePath,
      emailReceivedDate: parsedEmails.receivedDate,
    })
    .from(transactionsV2)
    .innerJoin(parsedEmails, eq(transactionsV2.parsedEmailId, parsedEmails.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(transactionsV2.transactionDate))
    .limit(limit)
    .offset(offset);

  return result as (TransactionWithEmail & { attachmentStoragePath: any })[];
}

/**
 * Helper function to parse attachment storage paths from the JSON field
 */
export function parseAttachmentStoragePaths(attachmentStoragePath: any): string[] {
  if (!attachmentStoragePath) return [];
  
  try {
    if (typeof attachmentStoragePath === 'string') {
      return JSON.parse(attachmentStoragePath);
    }
    if (Array.isArray(attachmentStoragePath)) {
      return attachmentStoragePath;
    }
    return [];
  } catch (error) {
    console.error('Error parsing attachment storage paths:', error);
    return [];
  }
} 