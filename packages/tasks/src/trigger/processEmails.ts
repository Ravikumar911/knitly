import { logger, task, wait, configure } from "@trigger.dev/sdk/v3";
import { refreshGoogleToken, fetchGmailMessages, fetchGmailMessage, extractEmailBody, EMAIL_PROCESSING_LIMIT, storeEmailData, storeTransactionData } from "../utils";
import { GmailHeader, GmailBodyPart } from "../types";
import { finwiseAIAgent } from "../agents/finwiseAI";

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

/**
 * Task that processes emails from Gmail
 * Uses Google OAuth to access the Gmail API and process messages
 */
export const processEmails = task({
  id: "process-emails",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload: {
    userId: string;
    limit?: number; // Optional parameter to override the default limit
  }, { ctx }) => {
    // Use the provided limit or fall back to the default
    const messageLimit = payload.limit || EMAIL_PROCESSING_LIMIT;
    
    logger.log("Processing emails", { 
      userId: payload.userId,
      limit: messageLimit
    });
    
    // Step 1: Refresh the provider token using the userId
    const providerToken = await refreshGoogleToken(payload.userId);
    
    if (!providerToken) {
      logger.error("Failed to refresh provider token", { userId: payload.userId });
      return {
        success: false,
        message: "Failed to refresh provider token",
      };
    }
    
    // Step 2: Use the refreshed token to fetch Gmail messages`
    const gmailData = await fetchGmailMessages(providerToken, messageLimit);
    
    if (!gmailData) {
      logger.error("Failed to fetch Gmail messages", { userId: payload.userId });
      return {
        success: false, 
        message: "Failed to fetch Gmail messages",
      };
    }
    
    // Step 3: Process each message (up to the specified limit)
    let processedCount = 0;
    if (gmailData.messages && gmailData.messages.length > 0) {
      // Process up to the specified limit
      for (const messageInfo of gmailData.messages.slice(0, messageLimit)) {
        logger.log("Fetching message details", { messageId: messageInfo.id });
        const messageData = await fetchGmailMessage(providerToken, messageInfo.id);

        
        
        if (messageData) {
          logger.log("Processing message", { 
            messageId: messageInfo.id,
            subject: messageData.payload?.headers.find((h: GmailHeader) => h.name === 'Subject')?.value || 'No Subject'
          });
          
          try {
            // Extract key information from the message
            const headers = messageData.payload?.headers || [];
            const subject = headers.find((h: GmailHeader) => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find((h: GmailHeader) => h.name === 'From')?.value || 'Unknown';
            const date = headers.find((h: GmailHeader) => h.name === 'Date')?.value || '';
            const attachments = messageData.payload?.parts?.filter((p: GmailBodyPart) => p.body?.data) || [];

            const finwiseAnalysis = await finwiseAIAgent({
              headers,
              attachments,
              subject,
              from,
              date,
              body: extractEmailBody(messageData)
            });

            logger.log("Finwise analysis", { finwiseAnalysis });
        
            
            // Store the email data
            const stored = await storeEmailData({
              messageId: messageInfo.id,
              userId: payload.userId,
              threadId: messageData.threadId,
              subject,
              from,
              date,
              body: extractEmailBody(messageData),
              snippet: messageData.snippet,
              detectedProvider: finwiseAnalysis.detectedProvider,
              emailType: finwiseAnalysis.emailType,
              parseSuccess: finwiseAnalysis.parseSuccess,
              parseErrors: finwiseAnalysis.parseErrors?.join(', '),
            });

            // If we successfully extracted transaction data, store it
            if (finwiseAnalysis.parseSuccess && finwiseAnalysis.transaction) {
              const transaction = finwiseAnalysis.transaction;
              
              // Store the transaction data
              await storeTransactionData({
                userId: payload.userId,
                parsedEmailId: messageInfo.id,
                amount: transaction.amount || 0,
                currency: transaction.currency || 'INR',
                type: transaction.type || '',
                transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate) : new Date(date),
                description: transaction.description || '',
                upiReferenceId: transaction.upiReferenceId || '',
                upiTransactionId: transaction.upiTransactionId || '',
                counterpartyUpiHandle: transaction.counterpartyUpiHandle || '',
                isRecurring: transaction.isRecurring || false,
              });
            }

            if (stored) {
              logger.log("Successfully processed and stored message", { 
                messageId: messageInfo.id,
                subject,
                from
              });
              
              processedCount++;
            } else {
              logger.warn("Processed message but failed to store it", {
                messageId: messageInfo.id,
                subject
              });
            }
          } catch (processError) {
            logger.error("Error processing message", {
              messageId: messageInfo.id,
              error: processError instanceof Error ? processError.message : String(processError)
            });
            // Continue processing other messages even if one fails
          }
        } else {
          logger.error("Failed to fetch message details", { messageId: messageInfo.id });
        }
        
        // Add a small delay between processing messages to avoid rate limits
        await wait.for({ seconds: 1 });
      }
    } else {
      logger.log("No messages found to process");
    }

    return {
      success: true,
      message: `Processed ${processedCount} out of up to ${messageLimit} emails`,
      processedCount,
      totalFound: gmailData.messages?.length || 0
    };
  },
});