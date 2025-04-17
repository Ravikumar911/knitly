import { task } from "@trigger.dev/sdk/v3";
import { schedules } from "@trigger.dev/sdk/v3";
import { markDuplicatesForAllUsers } from "@workspace/database";

/**
 * Detects and marks duplicate transactions across all users
 * Runs a two-stage duplicate detector: blocking + Fellegi-Sunter record linkage
 * 
 * This task:
 * 1. Finds all transactions without duplicate_of set
 * 2. Groups them by user
 * 3. Uses blocking keys based on amount|date|last4
 * 4. Computes log-odds scores within each block
 * 5. Marks duplicates by setting the duplicate_of column
 * 6. Logs how many duplicates were found
 */
export const detectDuplicateTransactions = task({
  id: "detect-duplicate-transactions",
  run: async () => {
    console.log("Starting duplicate transaction detection...");
    
    // Run the duplicate detection for all users
    const duplicatesFound = await markDuplicatesForAllUsers();
    
    console.log(`Completed duplicate detection. Found ${duplicatesFound} duplicates.`);
    
    return {
      duplicatesFound,
      completedAt: new Date().toISOString()
    };
  },
});

/**
 * Scheduled task to run duplicate detection daily
 */
export const scheduledDuplicateDetection = schedules.task({
  id: "scheduled-duplicate-detection",
  cron: "0 2 * * *", // Run at 2 AM daily
  run: async (payload) => {
    console.log("Running scheduled duplicate transaction detection...");
    console.log(`Scheduled time: ${payload.timestamp}`);
    
    // Run the duplicate detection for all users
    const duplicatesFound = await markDuplicatesForAllUsers();
    
    console.log(`Completed scheduled duplicate detection. Found ${duplicatesFound} duplicates.`);
    
    return {
      duplicatesFound,
      completedAt: new Date().toISOString()
    };
  },
}); 