import { eq, and } from "drizzle-orm";
import { db } from "../";
import { reconciliationResults } from "../schema/reconciliationResults";
import { transactions } from "../schema/transactions";
import { type ReconciliationResult } from "./operations/transactionDedup";

/**
 * Store reconciliation results in the database
 */
export async function storeReconciliationResult(
  userId: string,
  results: ReconciliationResult
) {
  return await db.insert(reconciliationResults).values({
    userId,
    originalCount: results.originalCount,
    dedupedCount: results.dedupedCount,
    duplicateCount: results.originalCount - results.dedupedCount,
    duplicateGroups: results.duplicateGroups,
    transactionsToMerge: results.transactionsToMerge,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
}

/**
 * Get the latest reconciliation result for a user
 */
export async function getLatestReconciliationResult(userId: string) {
  const result = await db
    .select()
    .from(reconciliationResults)
    .where(eq(reconciliationResults.userId, userId))
    .orderBy(reconciliationResults.createdAt)
    .limit(1);
    
  return result[0];
}

/**
 * Update reconciliation status to APPLIED
 */
export async function markReconciliationAsApplied(id: string, userId: string) {
  return await db.update(reconciliationResults)
    .set({ 
      status: 'APPLIED',
      appliedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reconciliationResults.id, id),
        eq(reconciliationResults.userId, userId)
      )
    )
    .returning();
}

/**
 * Update reconciliation status to REJECTED
 */
export async function markReconciliationAsRejected(id: string, userId: string) {
  return await db.update(reconciliationResults)
    .set({ 
      status: 'REJECTED',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reconciliationResults.id, id),
        eq(reconciliationResults.userId, userId)
      )
    )
    .returning();
}

/**
 * Get duplicate transactions for a user
 */
export async function getDuplicateTransactions(userId: string) {
  return await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, 'DUPLICATE')
      )
    )
    .orderBy(transactions.transactionDate);
} 