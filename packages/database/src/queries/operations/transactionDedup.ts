import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '../../index';
import { transactions } from '../../schema/transactions';
import { aiAnalysis } from '../../schema/aiAnalysis';
import { NewTransaction, Transaction } from '../../types';
import { TransactionStatus } from '../transactions';

// Represents a possible duplicate transaction group
export interface DuplicateTransactionGroup {
  transactions: Transaction[];
  confidence: number; // Confidence score 0-1 for how likely these are duplicates
  reason: string; // Why these transactions are considered duplicates
}

// Represents the result of a transaction reconciliation
export interface ReconciliationResult {
  originalCount: number; // Number of transactions before deduplication
  duplicateGroups: DuplicateTransactionGroup[]; // Groups of potential duplicate transactions
  transactionsToMerge: Record<string, string[]>; // Map of primary transaction ID to duplicate transaction IDs
  dedupedCount: number; // Number of transactions after deduplication
}

/**
 * Configuration options for transaction deduplication
 */
export interface DeduplicationConfig {
  // Time window in milliseconds to consider for potential duplicates (default: 24 hours)
  timeWindowMs: number;
  
  // Amount threshold for fuzzy matching (default: 0.01 = 1% difference)
  amountThreshold: number;
  
  // Minimum fuzzy match score to consider as duplicate (0-1, default: 0.7)
  minMatchScore: number;
  
  // Auto-merge transactions with confidence above this threshold (default: 0.9)
  autoMergeThreshold: number;
}

const DEFAULT_CONFIG: DeduplicationConfig = {
  timeWindowMs: 24 * 60 * 60 * 1000, // 24 hours
  amountThreshold: 0.01, // 1% difference
  minMatchScore: 0.7,
  autoMergeThreshold: 0.9,
};

/**
 * Finds potential duplicate transactions for a specific user within a given time window
 */
export async function findDuplicateTransactions(
  userId: string,
  config: Partial<DeduplicationConfig> = {}
): Promise<DuplicateTransactionGroup[]> {
  // Merge provided config with defaults
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Get all transactions for this user
  const userTransactions = await db.select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(transactions.transactionDate);
  
  if (userTransactions.length < 2) {
    return []; // No duplicates possible with less than 2 transactions
  }

  const duplicateGroups: DuplicateTransactionGroup[] = [];
  const processedTransactionIds = new Set<string>();

  // Loop through each transaction to find potential duplicates
  for (let i = 0; i < userTransactions.length; i++) {
    const transaction = userTransactions[i];
    
    // Skip this iteration if transaction is undefined
    if (!transaction) continue;
    
    // Skip if this transaction was already processed as part of a duplicate group
    if (processedTransactionIds.has(transaction.id)) continue;
    
    const potentialDuplicates = findPotentialDuplicatesFor(
      transaction,
      userTransactions.slice(i + 1).filter(Boolean) as Transaction[],
      mergedConfig
    );

    if (potentialDuplicates.transactions.length > 0) {
      // Add the original transaction to the group
      potentialDuplicates.transactions.unshift(transaction);
      
      // Mark all transactions in this group as processed
      potentialDuplicates.transactions.forEach(t => processedTransactionIds.add(t.id));
      
      duplicateGroups.push(potentialDuplicates);
    }
  }

  return duplicateGroups;
}

/**
 * Find potential duplicates for a specific transaction
 */
function findPotentialDuplicatesFor(
  transaction: Transaction,
  candidates: Transaction[],
  config: DeduplicationConfig
): DuplicateTransactionGroup {
  const duplicates: Transaction[] = [];
  let highestConfidence = 0;
  let reason = '';

  // Consider transaction date as a Date object for comparison
  const txDate = new Date(transaction.transactionDate);
  
  for (const candidate of candidates) {
    const candDate = new Date(candidate.transactionDate);
    
    // Skip if outside the time window
    const timeDiffMs = Math.abs(txDate.getTime() - candDate.getTime());
    if (timeDiffMs > config.timeWindowMs) continue;
    
    // Skip if clearly different transactions (different types or vastly different amounts)
    if (transaction.type !== candidate.type) continue;
    
    // Calculate amount difference percentage
    const amountDiff = Math.abs(transaction.amount - candidate.amount) / Math.max(transaction.amount, candidate.amount);
    if (amountDiff > config.amountThreshold) continue;
    
    // Calculate match score based on multiple factors
    const matchScore = calculateMatchScore(transaction, candidate);
    
    if (matchScore >= config.minMatchScore) {
      duplicates.push(candidate);
      
      if (matchScore > highestConfidence) {
        highestConfidence = matchScore;
        
        // Determine the reason for the potential duplicate
        reason = determineMatchReason(transaction, candidate, matchScore);
      }
    }
  }

  return {
    transactions: duplicates,
    confidence: highestConfidence,
    reason,
  };
}

/**
 * Calculate a match score between two transactions (0-1)
 */
function calculateMatchScore(tx1: Transaction, tx2: Transaction): number {
  let score = 0;
  let factors = 0;
  
  // Same amount is a strong indicator
  if (tx1.amount === tx2.amount) {
    score += 0.4;
  } else {
    // Calculate how close the amounts are (0-0.3)
    const amountDiff = Math.abs(tx1.amount - tx2.amount) / Math.max(tx1.amount, tx2.amount);
    score += Math.max(0, 0.3 * (1 - amountDiff * 10));
  }
  factors++;
  
  // Same transaction type
  if (tx1.type === tx2.type) {
    score += 0.1;
  }
  factors++;
  
  // Similar description
  if (tx1.description && tx2.description) {
    const descSimilarity = calculateStringSimilarity(tx1.description, tx2.description);
    score += 0.15 * descSimilarity;
    factors++;
  }
  
  // Same category
  if (tx1.category && tx2.category && tx1.category === tx2.category) {
    score += 0.1;
    factors++;
  }
  
  // Same merchant
  if (tx1.merchantName && tx2.merchantName) {
    const merchantSimilarity = calculateStringSimilarity(tx1.merchantName, tx2.merchantName);
    score += 0.15 * merchantSimilarity;
    factors++;
  }
  
  // Same payment method type
  if (
    tx1.paymentMethod && 
    tx2.paymentMethod && 
    typeof tx1.paymentMethod === 'object' && 
    typeof tx2.paymentMethod === 'object'
  ) {
    const pm1 = tx1.paymentMethod as Record<string, unknown>;
    const pm2 = tx2.paymentMethod as Record<string, unknown>;
    
    if (pm1.type && pm2.type && pm1.type === pm2.type) {
      score += 0.1;
    }
    factors++;
  }
  
  // Reference IDs match
  if (
    tx1.referenceIds && 
    tx2.referenceIds && 
    typeof tx1.referenceIds === 'object' && 
    typeof tx2.referenceIds === 'object'
  ) {
    // Check for common reference IDs
    const refs1 = tx1.referenceIds as Record<string, string | undefined>;
    const refs2 = tx2.referenceIds as Record<string, string | undefined>;
    
    let refMatches = 0;
    let refFields = 0;
    
    for (const key of Object.keys(refs1)) {
      if (refs1[key] && refs2[key]) {
        refFields++;
        if (refs1[key] === refs2[key]) {
          refMatches++;
        }
      }
    }
    
    if (refFields > 0) {
      score += 0.2 * (refMatches / refFields);
      factors++;
    }
  }
  
  // Close transaction date/time (within minutes) is a strong indicator
  const date1 = new Date(tx1.transactionDate);
  const date2 = new Date(tx2.transactionDate);
  const minutesDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);
  
  if (minutesDiff < 5) {
    score += 0.2; // Very close in time
  } else if (minutesDiff < 60) {
    score += 0.1; // Within an hour
  } else if (minutesDiff < 24 * 60) {
    score += 0.05; // Within a day
  }
  factors++;
  
  // Normalize score based on number of factors considered
  return score / factors;
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Simple approach - check for exact match or substring
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Calculate percentage of matching words
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  
  let matches = 0;
  for (const word of words1) {
    if (words2.has(word)) matches++;
  }
  
  const totalUniqueWords = new Set([...words1, ...words2]).size;
  return totalUniqueWords > 0 ? matches / totalUniqueWords : 0;
}

/**
 * Determine the reason for matching transactions
 */
function determineMatchReason(tx1: Transaction, tx2: Transaction, score: number): string {
  const reasons = [];
  
  // Check for same amount
  if (tx1.amount === tx2.amount) {
    reasons.push(`same amount (${tx1.amount})`);
  }
  
  // Check for similar dates
  const date1 = new Date(tx1.transactionDate);
  const date2 = new Date(tx2.transactionDate);
  const minutesDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);
  
  if (minutesDiff < 60) {
    reasons.push(`close timestamps (${minutesDiff.toFixed(0)} minutes apart)`);
  }
  
  // Check for matching merchant
  if (tx1.merchantName && tx2.merchantName && tx1.merchantName === tx2.merchantName) {
    reasons.push(`same merchant (${tx1.merchantName})`);
  }
  
  // Check for matching reference IDs
  if (
    tx1.referenceIds && 
    tx2.referenceIds && 
    typeof tx1.referenceIds === 'object' && 
    typeof tx2.referenceIds === 'object'
  ) {
    const refs1 = tx1.referenceIds as Record<string, string | undefined>;
    const refs2 = tx2.referenceIds as Record<string, string | undefined>;
    
    for (const key of Object.keys(refs1)) {
      if (refs1[key] && refs2[key] && refs1[key] === refs2[key]) {
        reasons.push(`matching ${key} (${refs1[key]})`);
        break; // Just mention one matching reference ID
      }
    }
  }
  
  return reasons.length > 0 
    ? `Potential duplicate: ${reasons.join(', ')}` 
    : `Potential duplicate with ${(score * 100).toFixed(0)}% confidence`;
}

/**
 * Reconcile transactions by identifying duplicates and suggesting merges
 */
export async function reconcileTransactions(
  userId: string,
  config: Partial<DeduplicationConfig> = {}
): Promise<ReconciliationResult> {
  // Find potential duplicates
  const duplicateGroups = await findDuplicateTransactions(userId, config);
  
  // Total number of transactions before deduplication
  const countResult = await db.select({ count: sql`count(*)`.mapWith(Number) })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  
  const count = countResult[0]?.count || 0;
  
  // Prepare transactions to merge (primary -> duplicates mapping)
  const transactionsToMerge: Record<string, string[]> = {};
  
  for (const group of duplicateGroups) {
    if (group.confidence >= (config.autoMergeThreshold || DEFAULT_CONFIG.autoMergeThreshold)) {
      // Get the best transaction to keep (primary)
      const primary = selectPrimaryTransaction(group.transactions);
      
      // Map duplicates to this primary transaction
      transactionsToMerge[primary.id] = group.transactions
        .filter(t => t.id !== primary.id)
        .map(t => t.id);
    }
  }
  
  // Calculate deduped count
  const dedupedCount = count - Object.values(transactionsToMerge)
    .reduce((sum, arr) => sum + arr.length, 0);
  
  return {
    originalCount: count,
    duplicateGroups,
    transactionsToMerge,
    dedupedCount,
  };
}

/**
 * Select the best transaction to keep from a group of duplicates
 */
function selectPrimaryTransaction(txGroup: Transaction[]): Transaction {
  if (txGroup.length === 0) {
    throw new Error('Cannot select primary transaction from empty group');
  }

  // Filter out any undefined transactions
  const validTransactions = txGroup.filter(Boolean) as Transaction[];
  
  if (validTransactions.length === 0) {
    throw new Error('No valid transactions found in group');
  }
  
  // Sort by criteria to find the best transaction
  const sorted = [...validTransactions].sort((a, b) => {
    // Prefer transactions with more complete data
    const completenessA = calculateDataCompleteness(a);
    const completenessB = calculateDataCompleteness(b);
    
    if (completenessA !== completenessB) {
      return completenessB - completenessA; // Higher completeness wins
    }
    
    // If equal completeness, prefer earlier created transactions
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateA - dateB;
  });
  
  if (sorted.length === 0) {
    throw new Error('No valid transactions found in group');
  }

  return sorted[0]!;
}

/**
 * Calculate data completeness score for a transaction (0-1)
 */
function calculateDataCompleteness(tx: Transaction): number {
  let fields = 0;
  let filledFields = 0;
  
  // Check essential fields
  const fieldsToCheck = [
    'description',
    'category',
    'merchantName',
    'paymentMethod',
    'referenceIds'
  ];
  
  for (const field of fieldsToCheck) {
    fields++;
    if (tx[field as keyof Transaction]) {
      filledFields++;
    }
  }
  
  return filledFields / fields;
}

/**
 * Apply deduplication by marking transactions as duplicates
 * This function will update the status of duplicate transactions
 */
export async function applyDeduplication(
  userId: string,
  transactionsToMerge: Record<string, string[]>
): Promise<void> {
  // For each primary -> duplicates mapping
  for (const [primaryId, duplicateIds] of Object.entries(transactionsToMerge)) {
    // Update duplicate transactions to mark them as duplicates
    if (duplicateIds.length > 0) {
      await db.update(transactions)
        .set({
          status: 'DUPLICATE' as TransactionStatus,
          notes: sql`CONCAT(COALESCE(${transactions.notes}, ''), ' [Duplicate of transaction ${primaryId}]')`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(transactions.userId, userId),
          sql`${transactions.id} = ANY(${duplicateIds})`
        ));
    }
  }
}

/**
 * Creates or updates a reconciliation record
 * This would typically be stored in a new reconciliation_results table
 */
// export async function storeReconciliationResult(
//   userId: string,
//   result: ReconciliationResult
// ): Promise<void> {
//   // This is a placeholder for creating a reconciliation record
//   // You would need to create a new table for storing reconciliation results
//   
//   console.log(`Reconciliation for user ${userId}: Found ${result.duplicateGroups.length} duplicate groups`);
//   console.log(`Original: ${result.originalCount}, Deduped: ${result.dedupedCount}`);
// } 