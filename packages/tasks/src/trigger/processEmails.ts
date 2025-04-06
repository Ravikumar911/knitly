import { logger, task, wait } from "@trigger.dev/sdk/v3";

export const processEmails = task({
  id: "process-emails",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload: {
    userId: string;
  }, { ctx }) => {
    logger.log("Processing emails", { payload, ctx });
    

    await wait.for({ seconds: 5 });

    return {
      message: "Hello, world!",
    }
  },
});