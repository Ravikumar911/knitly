import { logger, task, wait, configure } from "@trigger.dev/sdk/v3";
import { refreshGoogleToken, fetchGmailMessages, fetchGmailMessage, extractEmailBody, extractEmailMetadata } from "../utils";
import { GmailBodyPart } from "../types";
import { finwiseAIAgent } from "../agents/finwiseAI";
import { 
  getLastSyncTime, 
  getNextPageToken,
  updateLastSyncTime, 
  updateNextPageToken,
  markSyncComplete,
  markSyncInProgress,
  markSyncFailed,
  isEmailProcessed, 
  storeEmailData, 
  storeTransactionData 
} from "@workspace/database";

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

/**
 * Task that processes emails from Gmail with pagination support
 * Uses Google OAuth to access the Gmail API and process messages
 */
export const processEmails = task({
  id: "process-emails",
  maxDuration: 18000, // Stop executing after 30 mins of compute
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: {
    userId: string;
    forceFullSync?: boolean; // Force a full sync regardless of last sync time
    syncPeriodDays?: number; // Specify sync period in days (default: 90)
    continueFromToken?: string; // Continue processing from a specific page token
  }, { ctx }) => {
    const syncPeriodDays = payload.syncPeriodDays || 5;
    
    logger.log("Starting email sync", { 
      userId: payload.userId,
      forceFullSync: payload.forceFullSync || false,
      syncPeriodDays,
      hasContinuationToken: !!payload.continueFromToken
    });
    
    try {
      // Step 1: Determine sync period and continuation token
      let nextPageToken = payload.continueFromToken || null;
      
      if (!nextPageToken) {
        // Check if we have a stored next page token from a previous run
        nextPageToken = await getNextPageToken(payload.userId);
      }
      
      // If we have a continuation token, no need to check sync time
      const lastSyncTime = nextPageToken ? null : 
        (payload.forceFullSync ? null : await getLastSyncTime(payload.userId));
      
      const startDate = lastSyncTime || new Date(Date.now() - (syncPeriodDays * 24 * 60 * 60 * 1000));
      const isFirstSync = !lastSyncTime || payload.forceFullSync;
      const isContinuation = !!nextPageToken;
      
      logger.log("Sync parameters", {
        startDate: startDate.toISOString(),
        isFirstSync,
        isContinuation,
        nextPageToken
      });
      
      // Mark sync as in progress
      await markSyncInProgress(payload.userId, nextPageToken || undefined);
      
      // Step 2: Refresh the provider token for authentication
      const providerToken = await refreshGoogleToken(payload.userId);
      if (!providerToken) {
        await markSyncFailed(payload.userId, "Failed to refresh provider token");
        return {
          success: false,
          message: "Failed to refresh provider token",
          error: "PROVIDER_TOKEN_REFRESH_FAILED"
        };
      }
      
      // Step 3: Fetch Gmail messages with date filter and pagination
      let allStats = {
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        totalFound: 0
      };
      
      let currentPageToken = nextPageToken;
      
      while (true) {
        const gmailData = await fetchGmailMessages(providerToken, {
          after: isContinuation ? undefined : startDate,
          before: isContinuation ? undefined : new Date(),
          pageToken: currentPageToken || undefined
        });
        
        if (!gmailData) {
          await markSyncFailed(payload.userId, "Failed to fetch Gmail messages");
          return {
            success: false, 
            message: "Failed to fetch Gmail messages",
            error: "GMAIL_FETCH_FAILED"
          };
        }
        
        // Save the next page token for future runs (in case task times out)
        if (gmailData.nextPageToken) {
          await updateNextPageToken(payload.userId, gmailData.nextPageToken);
        } else {
          // If there's no next page token, we've reached the end
          await markSyncComplete(payload.userId);
        }
        
        // No messages found in this page
        if (!gmailData.messages || gmailData.messages.length === 0) {
          logger.log("No messages found to process in current page");
          
          if (!gmailData.nextPageToken) {
            // Only mark sync complete if we've reached the end
            await markSyncComplete(payload.userId);
            break;
          }
          currentPageToken = gmailData.nextPageToken;
          continue;
        }
        
        // Step 4: Process messages
        const stats = {
          processedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          totalFound: gmailData.messages.length
        };
        
        for (const messageInfo of gmailData.messages) {
          try {
            // Step 4a: Skip already processed emails
            const alreadyProcessed = await isEmailProcessed(payload.userId, messageInfo.id);
            if (alreadyProcessed) {
              logger.log("Skipping already processed email", { messageId: messageInfo.id });
              stats.skippedCount++;
              continue;
            }
            
            // Step 4b: Fetch message details
            logger.log("Fetching message details", { messageId: messageInfo.id });
            const messageData = await fetchGmailMessage(providerToken, messageInfo.id);
            
            // Avoid logging full message data as it's too verbose
            logger.log("Message received", { 
              messageId: messageInfo.id,
              threadId: messageData?.threadId,
              size: messageData?.sizeEstimate,
              labelCount: messageData?.labelIds?.length
            });
            
            if (!messageData) {
              logger.error("Failed to fetch message details", { messageId: messageInfo.id });
              stats.errorCount++;
              continue;
            }
            
            // Step 4c: Extract message metadata
            const metadata = extractEmailMetadata(messageData);
            const emailBody = extractEmailBody(messageData);
            
            logger.log("Processing message", { 
              messageId: messageInfo.id,
              subject: metadata.subject
            });
            
            // Step 4d: Parse email content with AI
            const finwiseAnalysis = await finwiseAIAgent({
              headers: messageData.payload?.headers || [],
              subject: metadata.subject,
              from: metadata.from,
              date: metadata.date,
              body: emailBody
            });
            
            // Step 4e: Store email data
            const storedEmail = await storeEmailData({
              messageId: messageInfo.id,
              userId: payload.userId,
              threadId: messageData.threadId || messageInfo.id, // Store threadId for reference
              subject: metadata.subject,
              sender: metadata.from,
              receivedDate: metadata.receivedDate,
              detectedProvider: finwiseAnalysis.detectedProvider,
              emailType: finwiseAnalysis.emailType,
              parseSuccess: finwiseAnalysis.parseSuccess || false,
              parseErrors: finwiseAnalysis.parseErrors?.join(', '),
              rawContent: emailBody,
            });
            
            if (!storedEmail || storedEmail.length === 0) {
              logger.warn("Failed to store email", { messageId: messageInfo.id });
              stats.errorCount++;
              continue;
            }
            
            // Step 4f: Store transaction data if detected
            if (finwiseAnalysis.parseSuccess && finwiseAnalysis.transaction) {
              const transaction = finwiseAnalysis.transaction;
              const parsedEmailId = storedEmail[0]?.id;
              
              if (parsedEmailId) {
                await storeTransactionData({
                  userId: payload.userId,
                  parsedEmailId,
                  amount: transaction.amount || 0,
                  currency: transaction.currency || 'INR',
                  type: transaction.type || '',
                  transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate) : metadata.receivedDate,
                  description: transaction.description || '',
                  upiReferenceId: transaction.upiReferenceId || '',
                  upiTransactionId: transaction.upiTransactionId || '',
                  counterpartyUpiHandle: transaction.counterpartyUpiHandle || '',
                  isRecurring: transaction.isRecurring || false,
                }).catch(error => {
                  logger.error("Error storing transaction", {
                    messageId: messageInfo.id,
                    error: error instanceof Error ? error.message : String(error)
                  });
                });
              } else {
                logger.error("Cannot store transaction, missing parsed email ID", {
                  messageId: messageInfo.id
                });
              }
            }
            
            logger.log("Successfully processed email", { 
              messageId: messageInfo.id,
              subject: metadata.subject
            });
            
            stats.processedCount++;
            
            // Add a small delay between processing messages to avoid rate limits
            await wait.for({ seconds: 1 });
          } catch (error) {
            logger.error("Error processing message", {
              messageId: messageInfo.id,
              error: error instanceof Error ? error.message : String(error)
            });
            stats.errorCount++;
          }
        }
        
        // Accumulate stats from this page
        allStats.processedCount += stats.processedCount;
        allStats.skippedCount += stats.skippedCount;
        allStats.errorCount += stats.errorCount;
        allStats.totalFound += stats.totalFound;
        
        // Check if we have more pages
        if (!gmailData.nextPageToken) {
          break;
        }
        
        // Update token for next iteration
        currentPageToken = gmailData.nextPageToken;
        
        // Add a small delay between pages to avoid rate limits
        await wait.for({ seconds: 2 });
      }
      
      // Step 5: Update the last sync time if this is not a continuation
      if (!isContinuation) {
        await updateLastSyncTime(payload.userId, new Date());
      }
      
      return {
        success: true,
        message: `Processed ${allStats.processedCount} emails, skipped ${allStats.skippedCount} already processed emails, encountered ${allStats.errorCount} errors, out of ${allStats.totalFound} total emails found${isContinuation ? ' (continuation)' : ' since ' + startDate.toISOString()}`,
        ...allStats,
        syncStartDate: startDate,
        isFirstSync,
        isContinuation,
        hasMorePages: false, // We've processed all pages
        nextPageToken: null // We've processed all pages
      };
    } catch (error) {
      logger.error("Critical error in email processing", {
        userId: payload.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      await markSyncFailed(payload.userId, error instanceof Error ? error.message : String(error));
      
      return {
        success: false,
        message: "Email processing failed with a critical error",
        error: error instanceof Error ? error.message : String(error),
        errorType: "CRITICAL_PROCESSING_ERROR"
      };
    }
  },
});