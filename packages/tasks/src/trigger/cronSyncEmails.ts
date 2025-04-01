import { cronTrigger } from "@trigger.dev/sdk";
import client from "../../trigger.config";
import { processEmails } from "./processEmails";

// Define the job
export const cronSyncEmails = client.defineJob({
  id: "cron-sync-emails",
  name: "Periodic Email Sync",
  version: "1.0.0",
  trigger: cronTrigger({
    cron: "0 */6 * * *", // Run every 6 hours
  }),
  run: async (payload, io) => {
    await io.logger.info("Starting periodic email sync");

    try {
      // TODO: Get all users with Gmail enabled from database
      const users = []; // Replace with actual database query

      if (!users.length) {
        await io.logger.info("No users with Gmail enabled");
        return {
          message: "No users with Gmail enabled",
        };
      }

      // Process emails for each user
      for (const user of users) {
        await io.runTask(`sync-user-${user.id}`, async () => {
          await client.sendEvent({
            name: "process.emails",
            payload: {
              userId: user.id,
              isInitialSync: false,
            },
          });
        });
      }

      return {
        success: true,
        processedUsers: users.length,
      };
    } catch (error) {
      await io.logger.error("Failed to sync emails", {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
}); 