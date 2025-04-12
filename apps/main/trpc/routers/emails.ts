import { TRPCError } from "@trpc/server";
import {  createTRPCRouter, protectedProcedure } from "../init";
import { createClient } from "@/supabase/server";
import { processEmails } from "@workspace/tasks/trigger/processEmails";

// Protected procedure middleware

// Router for email-related operations
export const emailsRouter = createTRPCRouter({
  // Route to refresh emails
  refresh: protectedProcedure
    .mutation(async () => {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        await processEmails.trigger({
          userId: user.id,
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
  
}); 