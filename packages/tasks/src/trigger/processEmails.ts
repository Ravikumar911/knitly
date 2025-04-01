import { eventTrigger } from "@trigger.dev/sdk";
import { z } from "zod";
import { OpenAI } from "openai";
import client from "../../trigger.config";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Define payload schema
const processEmailsPayload = z.object({
  userId: z.string(),
  isInitialSync: z.boolean().optional().default(false),
});

type ProcessEmailsPayload = z.infer<typeof processEmailsPayload>;

// Define the job
export const processEmails = client.defineJob({
  id: "process-user-emails",
  name: "Process User Emails",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "process.emails",
    schema: processEmailsPayload,
  }),
  run: async (payload: ProcessEmailsPayload, io) => {
    const { userId, isInitialSync } = payload;

    await io.logger.info("Starting email processing", {
      userId,
      isInitialSync,
    });

    try {
      // TODO: Implement email processing logic
      // 1. Get Gmail credentials
      // 2. Fetch emails
      // 3. Process each email with OpenAI
      // 4. Store results in database

      return {
        success: true,
        message: "Email processing completed",
      };
    } catch (error) {
      await io.logger.error("Failed to process emails", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
}); 