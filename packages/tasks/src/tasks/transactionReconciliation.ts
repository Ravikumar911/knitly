import { task } from "@trigger.dev/sdk/v3";
import { logger } from "@trigger.dev/sdk/v3";
import { 
  findDuplicateTransactions, 
  reconcileTransactions,
  applyDeduplication,
  DeduplicationConfig 
} from "@workspace/database";
import {
  storeReconciliationResult,
  markReconciliationAsApplied
} from "@workspace/database";

interface ReconcileTransactionsPayload {
  userId: string;
  config?: Partial<DeduplicationConfig>;
  autoApply?: boolean;
}

/**
 * Reconcile transactions for a user by identifying duplicates using fuzzy matching
 * 
 * This task:
 * 1. Finds potential duplicate transactions using configurable fuzzy matching
 * 2. Creates a reconciliation record with details on duplicates
 * 3. Optionally applies deduplication by marking duplicates
 */
export const reconcileTransactionsTask = task({
  id: "reconcile-transactions",
  run: async (payload: ReconcileTransactionsPayload) => {
    const { userId, config = {}, autoApply = false } = payload;
    
    logger.info("Starting transaction reconciliation", {
      userId,
      autoApply,
      configOverrides: config
    });
    
    try {
      // Find duplicate transactions and prepare reconciliation result
      const result = await reconcileTransactions(userId, config);
      
      logger.info("Reconciliation analysis complete", {
        userId,
        originalCount: result.originalCount,
        dedupedCount: result.dedupedCount,
        duplicateGroups: result.duplicateGroups.length,
        transactionsToMerge: Object.keys(result.transactionsToMerge).length
      });
      
      // Store the reconciliation result
      const [reconciliationRecord] = await storeReconciliationResult(userId, result);
      
      // If autoApply is enabled, apply the deduplication
      if (autoApply && Object.keys(result.transactionsToMerge).length > 0) {
        await applyDeduplication(userId, result.transactionsToMerge);
        
        // Mark reconciliation as applied
        if (reconciliationRecord) {
          await markReconciliationAsApplied(reconciliationRecord.id, userId);
        }
        
        logger.info("Deduplication applied automatically", {
          userId,
          duplicatesRemoved: result.originalCount - result.dedupedCount
        });
      }
      
      return {
        reconciliationId: reconciliationRecord?.id,
        originalCount: result.originalCount,
        dedupedCount: result.dedupedCount,
        duplicatesFound: result.originalCount - result.dedupedCount,
        duplicateGroups: result.duplicateGroups.length,
        applied: autoApply && Object.keys(result.transactionsToMerge).length > 0
      };
    } catch (error) {
      logger.error("Error during transaction reconciliation", {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
});

interface ScheduledReconciliationPayload {
  userId: string;
  applyHighConfidenceDuplicates?: boolean;
  confidenceThreshold?: number;
}

/**
 * Run scheduled transaction reconciliation for users
 * 
 * This can be used with a cron schedule to automatically find and potentially
 * resolve duplicate transactions on a regular basis
 */
export const scheduledReconciliationTask = task({
  id: "scheduled-reconciliation",
  run: async (payload: ScheduledReconciliationPayload) => {
    const { 
      userId, 
      applyHighConfidenceDuplicates = true,
      confidenceThreshold = 0.95 
    } = payload;
    
    logger.info("Running scheduled transaction reconciliation", {
      userId,
      applyHighConfidenceDuplicates,
      confidenceThreshold
    });
    
    try {
      // Run the reconciliation with custom config
      const config: Partial<DeduplicationConfig> = {
        autoMergeThreshold: confidenceThreshold
      };
      
      // Use the main reconciliation task
      const result = await reconcileTransactionsTask.triggerAndWait({
        userId,
        config,
        autoApply: applyHighConfidenceDuplicates
      });
      
      return result;
    } catch (error) {
      logger.error("Error during scheduled reconciliation", {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
}); 