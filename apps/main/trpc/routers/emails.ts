import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { 
  getSyncStatus, 
  checkUserHasData, 
  getSyncProgress, 
  getUnifiedSyncState,
} from "@workspace/database";

// Router for local sync-state operations
export const emailsRouter = createTRPCRouter({
  // Unified state endpoint (source of truth)
  state: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await getUnifiedSyncState(ctx.userId!);
      } catch (error) {
        console.error("Error getting unified sync state:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error getting unified sync state",
        });
      }
    }),
  // Check if user has any local seed data
  checkDataExists: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const dataStatus = await checkUserHasData(ctx.userId!);
        
        return {
          hasEmails: dataStatus.hasEmails,
          hasInitialSync: dataStatus.hasInitialSync,
          emailCount: dataStatus.emailCount,
          userState: dataStatus.userState,
          syncStatus: dataStatus.syncStatus,
          needsSync: dataStatus.userState !== 'has_data',
          oauthError: dataStatus.oauthError
        };
      } catch (error) {
        console.error("Error checking user data:", error);
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error checking user data",
        });
      }
    }),

  // Phase 1 records a local receipt. Real ingest lands in Phase 2.
  initiateSync: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const { runEmailSync } = await import("@workspace/tasks/trigger/processEmails");
        const result = await runEmailSync({ userId: ctx.userId! });

        return {
          success: true,
          message: result.skipped
            ? "A local Gmail sync is already running."
            : `Local Gmail sync complete: ${result.processedCount} processed, ${result.skippedCount} skipped.`
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

  // Get local sync progress
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
          statusMessage: getSyncStatusMessage(progress),
          // Legacy error shape retained until the sync model is simplified.
          oauthError: progress.oauthErrorType ? {
            type: progress.oauthErrorType,
            code: progress.oauthErrorCode,
            requiresReauth: progress.requiresReauth,
            userFriendlyMessage: progress.userFriendlyError
          } : null
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

  // Route to refresh local seed status
  refresh: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const { runEmailSync } = await import("@workspace/tasks/trigger/processEmails");
        const result = await runEmailSync({ userId: ctx.userId! });

        return {
          success: true,
          message: result.skipped
            ? "A local Gmail sync is already running."
            : `Local Gmail sync complete: ${result.processedCount} processed, ${result.skippedCount} skipped.`,
          taskId: "local-gmail-" + Date.now(),
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

  // Get the current local sync status for the user
  getSyncStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const status = await getSyncStatus(ctx.userId!);
        
        return {
          lastSyncedAt: status.lastSyncedAt,
          nextPageToken: status.nextPageToken,
          syncStatus: status.syncStatus,
          errorDetails: status.errorDetails,
          hasSynced: status.lastSyncedAt !== null,
          // Legacy error shape retained until the sync model is simplified.
          oauthError: status.oauthErrorType ? {
            type: status.oauthErrorType,
            code: status.oauthErrorCode,
            requiresReauth: status.requiresReauth,
            userFriendlyMessage: status.userFriendlyError
          } : null
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

// Helper function to generate user-friendly status messages.
function getSyncStatusMessage(progress: {
  syncStatus: string | null;
  processedEmails: number;
  totalEmails: number | null;
  oauthErrorType: string | null;
  userFriendlyError: string | null;
}): string {
  if (progress.oauthErrorType && progress.userFriendlyError) {
    return progress.userFriendlyError;
  }

  if (!progress.syncStatus) {
    return "No sync in progress";
  }

  switch (progress.syncStatus) {
    case 'counting_emails':
      return "Preparing local records...";
    case 'syncing':
      if (progress.totalEmails) {
        const remaining = progress.totalEmails - progress.processedEmails;
        return `Processing records... ${remaining} remaining`;
      }
      return "Processing local records...";
    case 'complete':
      return "Local data is ready.";
    case 'failed':
      if (progress.oauthErrorType) {
        return progress.userFriendlyError || "Local sync state needs attention";
      }
      return "Local sync failed. Please try again.";
    case 'in_progress':
      return "Local sync in progress...";
    default:
      return "Sync status unknown";
  }
} 
