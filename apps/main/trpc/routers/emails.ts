import { TRPCError } from "@trpc/server";
import { baseProcedure, createTRPCRouter } from "../init";
import { createClient } from "@/supabase/server";
import { processEmails } from "@workspace/tasks";

// Protected procedure middleware
const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

// Router for email-related operations
export const emailsRouter = createTRPCRouter({
  // Route to refresh emails
  refresh: protectedProcedure
    .mutation(async () => {
      try {
        // Get the current user session
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        console.log("session", session?.provider_token);
        
        // Check for provider token (needed for Gmail API)
        if (!session?.provider_token) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No provider token available - please reconnect your Google account",
          });
        }

        await processEmails.trigger({
          userId: session.user.id,
          accessToken: session.provider_token.substring(0, 10) + "...", // Log only part of the token for security
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