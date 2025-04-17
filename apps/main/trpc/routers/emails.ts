import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { processEmails } from "@workspace/tasks/trigger/processEmails";
import { getSyncStatus } from "@workspace/database";

// Router for email-related operations
export const emailsRouter = createTRPCRouter({
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