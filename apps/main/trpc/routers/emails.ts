import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { processEmails } from "@workspace/tasks/trigger/processEmails";
import { 
  getSyncStatus, 
  checkUserHasData, 
  getSyncProgress, 
  initializeSync 
} from "@workspace/database";

// Router for email-related operations
export const emailsRouter = createTRPCRouter({
  // Check if user has any synced data
  checkDataExists: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const dataStatus = await checkUserHasData(ctx.userId!);
        
        return {
          hasEmails: dataStatus.hasEmails,
          hasInitialSync: dataStatus.hasInitialSync,
          emailCount: dataStatus.emailCount,
          needsSync: !dataStatus.hasInitialSync || dataStatus.emailCount === 0
        };
      } catch (error) {
        console.error("Error checking user data:", error);
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error checking user data",
        });
      }
    }),

  // Initiate email sync - triggers TriggerDev task
  initiateSync: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Just trigger the email processing job
        // The job itself will:
        // 1. Get Gmail email count with proper filters
        // 2. Initialize sync in database with count
        // 3. Process emails with progress tracking
        await processEmails.trigger({
          userId: ctx.userId!,
        });

        return {
          success: true,
          message: "Email sync started successfully. We're counting your emails and will show progress shortly."
        };
      } catch (error) {
        console.error("Error initiating sync:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error initiating sync",
        });
      }
    }),

  // Get real-time sync progress
  getSyncProgress: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const progress = await getSyncProgress(ctx.userId!);
        
        return {
          totalEmails: progress.totalEmails,
          processedEmails: progress.processedEmails,
          progressPercentage: progress.progressPercentage,
          estimatedCompletion: progress.estimatedCompletion,
          syncStatus: progress.syncStatus,
          hasInitialSync: progress.hasInitialSync,
          statusMessage: getSyncStatusMessage(progress)
        };
      } catch (error) {
        console.error("Error getting sync progress:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error getting sync progress",
        });
      }
    }),

  // Route to refresh emails
  refresh: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        await processEmails.trigger({
          userId: ctx.userId!, // We can safely use ! here because protectedProcedure ensures userId exists
        });

        return {
          success: true,
          message: "Email refresh task triggered successfully",
          taskId: "simulated-task-id-" + Date.now(),
        };
      } catch (error) {
        console.error("Error refreshing emails:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error refreshing emails",
        });
      }
    }),

  // Get the current email sync status for the user
  getSyncStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const status = await getSyncStatus(ctx.userId!);
        
        return {
          lastSyncedAt: status.lastSyncedAt,
          nextPageToken: status.nextPageToken,
          syncStatus: status.syncStatus,
          errorDetails: status.errorDetails,
          hasSynced: status.lastSyncedAt !== null
        };
      } catch (error) {
        console.error("Error getting sync status:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error getting sync status",
        });
      }
    }),
});

// Helper function to generate user-friendly status messages
function getSyncStatusMessage(progress: {
  syncStatus: string | null;
  processedEmails: number;
  totalEmails: number | null;
}): string {
  if (!progress.syncStatus) {
    return "No sync in progress";
  }

  switch (progress.syncStatus) {
    case 'counting_emails':
      return "Counting your emails...";
    case 'syncing':
      if (progress.totalEmails) {
        const remaining = progress.totalEmails - progress.processedEmails;
        return `Processing emails... ${remaining} remaining`;
      }
      return "Processing your emails...";
    case 'complete':
      return "Email sync completed successfully!";
    case 'failed':
      return "Email sync failed. Please try again.";
    case 'in_progress':
      return "Email sync in progress...";
    default:
      return "Sync status unknown";
  }
} 