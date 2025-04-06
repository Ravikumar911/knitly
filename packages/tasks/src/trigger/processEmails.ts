import { logger, task, wait, configure } from "@trigger.dev/sdk/v3";
import { refreshProviderToken, fetchGmailMessages, fetchGmailMessage } from "@workspace/database";

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

export const processEmails = task({
  id: "process-emails",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload: {
    userId: string;
  }, { ctx }) => {
    logger.log("Processing emails", { payload, ctx });
    
    // Step 1: Refresh the provider token using the userId
    const providerToken = await refreshProviderToken(payload.userId);
    
    if (!providerToken) {
      logger.error("Failed to refresh provider token", { userId: payload.userId });
      return {
        success: false,
        message: "Failed to refresh provider token",
      };
    }
    
    // Step 2: Use the refreshed token to fetch Gmail messages
    const gmailData = await fetchGmailMessages(providerToken);
    
    if (!gmailData) {
      logger.error("Failed to fetch Gmail messages", { userId: payload.userId });
      return {
        success: false, 
        message: "Failed to fetch Gmail messages",
      };
    }
    
    // Step 3: Process each message (simplified example)
    let processedCount = 0;
    if (gmailData.messages && gmailData.messages.length > 0) {
      for (const messageInfo of gmailData.messages.slice(0, 5)) { // Process up to 5 messages
        const messageData = await fetchGmailMessage(providerToken, messageInfo.id);
        
        if (messageData) {
          logger.log("Processing message", { messageId: messageInfo.id });
          // Here you would add code to parse the email and store data
          // For example: await parseAndStoreEmailData(messageData, payload.userId);
          processedCount++;
        }
      }
    }

    await wait.for({ seconds: 5 });

    return {
      success: true,
      message: `Processed ${processedCount} emails`,
      processedCount,
    };
  },
});