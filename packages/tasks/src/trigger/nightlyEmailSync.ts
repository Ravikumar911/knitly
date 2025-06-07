import { logger, schedules, batch } from "@trigger.dev/sdk/v3";
import { getUsersNeedingSync } from "@workspace/database";
import { processEmails } from "./processEmails";

/**
 * Nightly scheduled task that syncs emails for all users
 * Runs every day at midnight UTC
 */
export const nightlyEmailSync = schedules.task({
  id: "nightly-email-sync",
  // Run at midnight UTC every day
  cron: "0 0 * * *",
  maxDuration: 7200, // 2 hours max duration
  retry: {
    maxAttempts: 2,
    factor: 1.5,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload) => {
    logger.log("Starting nightly email sync", {
      scheduledTime: payload.timestamp,
      timezone: payload.timezone,
      scheduleId: payload.scheduleId,
    });

    try {
      // Get all users who need syncing
      const usersNeedingSync = await getUsersNeedingSync();
      
      logger.log("Found users needing sync", {
        userCount: usersNeedingSync.length,
        users: usersNeedingSync.map(u => ({
          userId: u.userId,
          lastSyncedAt: u.lastSyncedAt,
          daysSinceLastSync: u.lastSyncedAt 
            ? Math.floor((Date.now() - u.lastSyncedAt.getTime()) / (24 * 60 * 60 * 1000))
            : 'never'
        }))
      });

      if (usersNeedingSync.length === 0) {
        logger.log("No users need syncing, task complete");
        return {
          success: true,
          message: "No users needed syncing",
          usersSynced: 0,
          usersSkipped: 0,
          errors: 0
        };
      }

      // Process users in smaller batches to avoid overwhelming the system
      const BATCH_SIZE = 10; // Process 10 users simultaneously
      const batches = [];
      
      for (let i = 0; i < usersNeedingSync.length; i += BATCH_SIZE) {
        const userBatch = usersNeedingSync.slice(i, i + BATCH_SIZE);
        
        // Create batch of sync tasks
        const batchTasks = userBatch.map(user => ({
          task: processEmails,
          payload: {
            userId: user.userId,
            syncPeriodDays: 7, // Sync last 7 days for nightly sync
          }
        }));
        
        batches.push(batchTasks);
      }

      // Process batches sequentially to avoid rate limits
      const results = {
        usersSynced: 0,
        usersSkipped: 0,
        errors: 0,
        errorDetails: [] as Array<{userId: string, error: string}>
      };

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const currentBatch = batches[batchIndex];
        
        if (!currentBatch) {
          logger.error("Batch is undefined", { batchIndex });
          continue;
        }
        
        logger.log("Processing user batch", {
          batchNumber: batchIndex + 1,
          totalBatches: batches.length,
          usersInBatch: currentBatch.length
        });

        try {
          // Process batch of users in parallel
          const batchResults = await batch.triggerByTaskAndWait(currentBatch);
          
          // Analyze results
          for (let resultIndex = 0; resultIndex < batchResults.runs.length; resultIndex++) {
            const result = batchResults.runs[resultIndex];
            const userId = currentBatch[resultIndex]!.payload.userId;
            
            if (result && result.ok) {
              if ('success' in result.output && result.output.success) {
                results.usersSynced++;
                logger.log("User sync completed successfully", {
                  userId,
                  processedEmails: 'processedCount' in result.output ? result.output.processedCount : 0,
                  totalEmails: 'totalFound' in result.output ? result.output.totalFound : 0
                });
              } else {
                results.errors++;
                results.errorDetails.push({
                  userId,
                  error: 'message' in result.output ? result.output.message : 'Unknown sync error'
                });
                logger.error("User sync failed", {
                  userId,
                  error: 'message' in result.output ? result.output.message : 'Unknown error',
                  errorType: 'errorType' in result.output ? result.output.errorType : undefined
                });
              }
            } else {
              results.errors++;
              results.errorDetails.push({
                userId,
                error: 'Task execution failed'
              });
              logger.error("User sync task failed", {
                userId,
                error: result ? result.error : 'Unknown error'
              });
            }
          }
          
          // Small delay between batches to be respectful to Gmail API
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
          }
          
        } catch (error) {
          logger.error("Batch processing failed", {
            batchNumber: batchIndex + 1,
            error: error instanceof Error ? error.message : String(error),
            usersInBatch: currentBatch.map(t => t.payload.userId)
          });
          
          // Mark all users in this batch as errors
          for (const task of currentBatch) {
            results.errors++;
            results.errorDetails.push({
              userId: task.payload.userId,
              error: 'Batch processing failed'
            });
          }
        }
      }

      const successRate = ((results.usersSynced / usersNeedingSync.length) * 100).toFixed(1);
      
      logger.log("Nightly email sync completed", {
        totalUsers: usersNeedingSync.length,
        usersSynced: results.usersSynced,
        errors: results.errors,
        successRate: `${successRate}%`,
        duration: `${((Date.now() - payload.timestamp.getTime()) / 1000 / 60).toFixed(1)} minutes`,
        errorSummary: results.errorDetails.length > 0 ? results.errorDetails : undefined
      });

      return {
        success: true,
        message: `Nightly sync completed: ${results.usersSynced}/${usersNeedingSync.length} users synced successfully`,
        totalUsers: usersNeedingSync.length,
        usersSynced: results.usersSynced,
        errors: results.errors,
        successRate: parseFloat(successRate),
        errorDetails: results.errorDetails
      };

    } catch (error) {
      logger.error("Critical error in nightly sync", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        message: "Nightly sync failed with critical error",
        error: error instanceof Error ? error.message : String(error),
        totalUsers: 0,
        usersSynced: 0,
        errors: 1
      };
    }
  }
}); 