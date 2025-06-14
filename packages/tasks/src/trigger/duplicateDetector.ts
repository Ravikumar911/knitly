import { task } from "@trigger.dev/sdk/v3";
import { markDuplicatesForUser } from "@workspace/database";

/**
 * Detects and marks duplicate transactions for a specific user
 * Runs a two-stage duplicate detector: blocking + Fellegi-Sunter record linkage
 * 
 * This task:
 * 1. Finds all transactions for the user without duplicate_of set
 * 2. Uses blocking keys based on amount|date|last4
 * 3. Computes log-odds scores within each block
 * 4. Marks duplicates by setting the duplicate_of column
 * 5. Logs how many duplicates were found
 */
export const detectDuplicateTransactionsForUser = task({
  id: "detect-duplicate-transactions-user",
  run: async (payload: { userId: string }) => {
    console.log(`Starting duplicate transaction detection for user: ${payload.userId}`);
    
    // Run the duplicate detection for this specific user
    const duplicatesFound = await markDuplicatesForUser(payload.userId);
    
    console.log(`Completed duplicate detection for user ${payload.userId}. Found ${duplicatesFound} duplicates.`);
    
    return {
      userId: payload.userId,
      duplicatesFound,
      completedAt: new Date().toISOString()
    };
  },
}); 