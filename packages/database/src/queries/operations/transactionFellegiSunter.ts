import { eq, isNull } from 'drizzle-orm';
import { db } from '../../index';
import { transactionsV2 } from '../../schema/transactionsV2';
import { Transaction } from '../../types';

/**
 * Implements a two-stage duplicate detector (blocking + Fellegi-Sunter record linkage)
 * for transaction deduplication.
 * 
 * 1. Creates blocking keys based on amount, date, and payment.last4
 * 2. Within each block, computes log-odds scores based on field similarities
 * 3. Marks transactions as duplicates if they exceed the threshold
 * 4. Respects payment method uniqueness (never marks as duplicate with different last4)
 */
export async function markDuplicates(transactions: Transaction[]): Promise<Transaction[]> {
  if (transactions.length === 0) return [];
  
  // Step 1: Group transactions by blocking key
  const blocks = groupTransactionsByBlockingKey(transactions);
  
  // Step 2: Process each block to find duplicates
  const duplicates: Record<string, string> = {}; // duplicate_id -> canonical_id
  let duplicateCount = 0;
  
  for (const [blockingKey, blockTransactions] of Object.entries(blocks)) {
    if (blockTransactions.length <= 1) continue; // Skip blocks with only one transaction
    
    // Sort by date (ascending) - earliest transaction becomes the canonical one
    blockTransactions.sort((a, b) => {
      return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
    });
    
    const canonical = blockTransactions[0];
    if (!canonical) continue;
    
    // Compare each transaction to the canonical one
    for (let i = 1; i < blockTransactions.length; i++) {
      const candidate = blockTransactions[i];
      if (!candidate) continue;
      
      // Never mark as duplicate when payment.last4 differs and both exist
      const paymentLast4Match = checkPaymentMethodLast4Match(canonical, candidate);
      if (paymentLast4Match === false) continue;
      
      // Compute log-odds score
      const score = computeLogOddsScore(canonical, candidate);
      
      // If score exceeds threshold, mark as duplicate
      if (score > 0) {
        duplicates[candidate.id] = canonical.id;
        duplicateCount++;
      }
    }
  }
  
  // Step 3: Update the duplicate_of column in the database
  if (duplicateCount > 0) {
    await updateDuplicateReferences(duplicates);
    console.log(`Marked ${duplicateCount} transactions as duplicates`);
  }
  
  // Return updated transactions
  return transactions.map(txn => {
    if (txn.id in duplicates) {
      return {
        ...txn,
        duplicateOf: duplicates[txn.id] || null
      };
    }
    return txn;
  }) as Transaction[];
}

/**
 * Groups transactions by blocking key
 * Blocking key format: ${amount}|${date.slice(0,10)}|${payment.last4 ?? ''}
 */
function groupTransactionsByBlockingKey(transactions: Transaction[]): Record<string, Transaction[]> {
  const blocks: Record<string, Transaction[]> = {};
  
  for (const txn of transactions) {
    const paymentMethod = txn.paymentMethod as { last4?: string } | null | undefined;
    const last4 = paymentMethod?.last4 ?? '';
    
    // Create blocking key using amount, date (without time), and payment method last4
    const date = txn.transactionDate.toString().slice(0, 10); // YYYY-MM-DD
    const blockingKey = `${txn.amount}|${date}|${last4}`;
    
    if (!blocks[blockingKey]) {
      blocks[blockingKey] = [];
    }
    
    blocks[blockingKey].push(txn);
  }
  
  return blocks;
}

/**
 * Check if payment methods match by last4
 * Returns:
 * - true if both have matching last4
 * - true if neither has last4
 * - false if both have last4 but they differ
 * - null if only one has last4
 */
function checkPaymentMethodLast4Match(tx1: Transaction, tx2: Transaction): boolean | null {
  const pm1 = tx1.paymentMethod as { last4?: string } | null | undefined;
  const pm2 = tx2.paymentMethod as { last4?: string } | null | undefined;
  
  const last4_1 = pm1?.last4;
  const last4_2 = pm2?.last4;
  
  // If both have last4, they must match
  if (last4_1 && last4_2) {
    return last4_1 === last4_2;
  }
  
  // If neither has last4, consider it a match
  if (!last4_1 && !last4_2) {
    return true;
  }
  
  // If only one has last4, the result is indeterminate
  return null;
}

/**
 * Compute the log-odds score for field similarities between transactions
 * score = Σ log2(m/u) where m,u = { amount: .98/.01, merchant: .92/.08, desc: .85/.15, ±1day: .97/.10, refId: .99/.02 }
 */
function computeLogOddsScore(tx1: Transaction, tx2: Transaction): number {
  let score = 0;
  
  // Amount match - already matched by blocking key, but adding for completeness
  if (tx1.amount === tx2.amount) {
    score += Math.log2(0.98 / 0.01);
  }
  
  // Merchant match
  if (tx1.merchantName && tx2.merchantName && 
      tx1.merchantName.toLowerCase() === tx2.merchantName.toLowerCase()) {
    score += Math.log2(0.92 / 0.08);
  }
  
  // Description similarity
  if (tx1.description && tx2.description) {
    const desc1 = tx1.description.toLowerCase();
    const desc2 = tx2.description.toLowerCase();
    
    // Simple string similarity check (could be improved with more sophisticated methods)
    if (desc1 === desc2) {
      score += Math.log2(0.85 / 0.15);
    } else if (desc1.includes(desc2) || desc2.includes(desc1)) {
      // Partial match
      score += Math.log2(0.75 / 0.25);
    }
  }
  
  // Date proximity (±1 day)
  const date1 = new Date(tx1.transactionDate);
  const date2 = new Date(tx2.transactionDate);
  const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 1) {
    score += Math.log2(0.97 / 0.10);
  }
  
  // Reference ID match
  if (tx1.referenceIds && tx2.referenceIds) {
    const refs1 = tx1.referenceIds as Record<string, string | undefined>;
    const refs2 = tx2.referenceIds as Record<string, string | undefined>;
    
    for (const key of Object.keys(refs1)) {
      if (refs1[key] && refs2[key] && refs1[key] === refs2[key]) {
        score += Math.log2(0.99 / 0.02);
        break; // Only count one reference ID match
      }
    }
  }
  
  return score;
}

/**
 * Update duplicate_of references in the database
 */
async function updateDuplicateReferences(duplicates: Record<string, string>): Promise<void> {
  const duplicateIds = Object.keys(duplicates);
  
  for (const duplicateId of duplicateIds) {
    const canonicalId = duplicates[duplicateId];
    
    await db.update(transactionsV2)
      .set({ duplicateOf: canonicalId })
      .where(eq(transactionsV2.id, duplicateId));
  }
}

/**
 * Find and mark duplicates for all transactions that don't already have duplicate_of set
 * Returns the number of new duplicates found
 */
export async function markDuplicatesForAllUsers(): Promise<number> {
  // Get all transactions without duplicate_of set
  const allTransactions = await db.select()
    .from(transactionsV2)
    .where(isNull(transactionsV2.duplicateOf))
    .orderBy(transactionsV2.transactionDate);
  
  // Group by user ID
  const transactionsByUser: Record<string, Transaction[]> = {};
  
  for (const txn of allTransactions) {
    const userId = txn.userId;
    if (!transactionsByUser[userId]) {
      transactionsByUser[userId] = [];
    }
    transactionsByUser[userId].push(txn);
  }
  
  // Process each user's transactions separately
  let totalDuplicatesFound = 0;
  
  for (const [userId, userTransactions] of Object.entries(transactionsByUser)) {
    const beforeCount = userTransactions.length;
    const updatedTransactions = await markDuplicates(userTransactions);
    const afterCount = updatedTransactions.filter(txn => !txn.duplicateOf).length;
    
    const duplicatesFound = beforeCount - afterCount;
    totalDuplicatesFound += duplicatesFound;
    
    console.log(`User ${userId}: Found ${duplicatesFound} duplicates out of ${beforeCount} transactions`);
  }
  
  return totalDuplicatesFound;
} 