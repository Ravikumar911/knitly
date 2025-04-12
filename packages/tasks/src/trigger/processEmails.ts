import { logger, task, wait, configure } from "@trigger.dev/sdk/v3";
import { refreshGoogleToken, fetchGmailMessages, fetchGmailMessage, extractEmailBody, extractEmailMetadata, buildGmailSearchQuery, extractAttachments } from "../utils";
import { GmailBodyPart, GmailAttachment } from "../types";
import { finwiseAIAgent } from "../agents/finwiseAI";
import { createClient } from "@supabase/supabase-js";
import { 
  getLastSyncTime, 
  updateLastSyncTime, 
  markSyncComplete,
  markSyncInProgress,
  markSyncFailed,
  isEmailProcessed, 
  storeEmailData, 
  storeTransactionData,
  getEmailExtractionPatterns 
} from "@workspace/database";

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

// Initialize Supabase client for storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    syncPeriodDays?: number; // Specify sync period in days (default: 90)
  }, { ctx }) => {
    const syncPeriodDays = payload.syncPeriodDays || 5;
    
    logger.log("Starting email sync", { 
      userId: payload.userId,
      syncPeriodDays
    });
    
    try {
      // Step 1: Get active email patterns to build search query
      const patterns = await getEmailExtractionPatterns();
      const searchQuery = await buildGmailSearchQuery(patterns);
      
      logger.log("Built Gmail search query", { searchQuery });
      
      // Step 2: Determine sync period
      const lastSyncTime = await getLastSyncTime(payload.userId);
      const startDate = lastSyncTime || new Date(Date.now() - (syncPeriodDays * 24 * 60 * 60 * 1000));
      const isFirstSync = !lastSyncTime;
      
      logger.log("Sync parameters", {
        startDate: startDate.toISOString(),
        isFirstSync
      });
      
      // Mark sync as in progress
      await markSyncInProgress(payload.userId);
      
      // Step 3: Refresh the provider token for authentication
      const providerToken = await refreshGoogleToken(payload.userId);
      if (!providerToken) {
        await markSyncFailed(payload.userId, "Failed to refresh provider token");
        return {
          success: false,
          message: "Failed to refresh provider token",
          error: "PROVIDER_TOKEN_REFRESH_FAILED"
        };
      }
      
      // Step 4: Fetch Gmail messages with date filter and search query
      let allStats = {
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        totalFound: 0
      };
      
      let currentPageToken = null;
      
      while (true) {
        const gmailData = await fetchGmailMessages(providerToken, {
          after: startDate,
          before: new Date(),
          pageToken: currentPageToken || undefined,
          query: searchQuery || undefined
        });
        
        if (!gmailData) {
          await markSyncFailed(payload.userId, "Failed to fetch Gmail messages");
          return {
            success: false, 
            message: "Failed to fetch Gmail messages",
            error: "GMAIL_FETCH_FAILED"
          };
        }
        
        // No messages found in this page
        if (!gmailData.messages || gmailData.messages.length === 0) {
          logger.log("No messages found to process in current page");
          
          if (!gmailData.nextPageToken) {
            await markSyncComplete(payload.userId);
            break;
          }
          currentPageToken = gmailData.nextPageToken;
          continue;
        }
        
        // Step 5: Process messages
        const stats = {
          processedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          totalFound: gmailData.messages.length
        };
        
        for (const messageInfo of gmailData.messages) {
          try {
            // Step 5a: Skip already processed emails
            const alreadyProcessed = await isEmailProcessed(payload.userId, messageInfo.id);
            if (alreadyProcessed) {
              logger.log("Skipping already processed email", { messageId: messageInfo.id });
              stats.skippedCount++;
              continue;
            }
            
            // Step 5b: Fetch message details
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
            
            // Step 5c: Extract message metadata and check for attachments
            const metadata = extractEmailMetadata(messageData);
            const emailBody = extractEmailBody(messageData);
            const attachments = extractAttachments(messageData);
            
            logger.log("Processing message", { 
              messageId: messageInfo.id,
              subject: metadata.subject,
              hasAttachment: attachments.length > 0
            });

            // Step 5d: Upload attachment to Supabase storage if present
            let attachmentStoragePath: string | undefined;
            if (attachments.length > 0) {
              try {
                // We'll store only the first attachment for now
                const attachment = attachments[0]!;
                attachmentStoragePath = `attachments/${payload.userId}/${messageInfo.id}/${attachment.filename}`;
                
                const { error: uploadError } = await supabase.storage
                  .from('email-attachments')
                  .upload(attachmentStoragePath, attachment.data!, {
                    contentType: attachment.mimeType,
                    upsert: true
                  });

                if (uploadError) {
                  logger.error("Failed to upload attachment", {
                    messageId: messageInfo.id,
                    error: uploadError.message
                  });
                  attachmentStoragePath = undefined;
                } else {
                  logger.log("Uploaded attachment", {
                    messageId: messageInfo.id,
                    path: attachmentStoragePath
                  });
                }
              } catch (error) {
                logger.error("Error uploading attachment", {
                  messageId: messageInfo.id,
                  error: error instanceof Error ? error.message : String(error)
                });
                attachmentStoragePath = undefined;
              }
            }
            
            // Step 5e: Process with AI
            const finwiseAnalysis = await finwiseAIAgent({
              headers: messageData.payload?.headers || [],
              subject: metadata.subject,
              from: metadata.from,
              date: metadata.date,
              body: emailBody
            });
            
            // Step 5f: Store email data
            const storedEmail = await storeEmailData({
              messageId: messageInfo.id,
              userId: payload.userId,
              threadId: messageData.threadId || messageInfo.id,
              subject: metadata.subject,
              sender: metadata.from,
              receivedDate: metadata.receivedDate,
              detectedProvider: finwiseAnalysis.detectedProvider,
              emailType: finwiseAnalysis.emailType,
              parseSuccess: finwiseAnalysis.parseSuccess || false,
              parseErrors: finwiseAnalysis.parseErrors?.join(', '),
              rawContent: emailBody,
              attachmentStoragePath
            });
            
            if (!storedEmail || storedEmail.length === 0) {
              logger.warn("Failed to store email", { messageId: messageInfo.id });
              stats.errorCount++;
              continue;
            }
            
            // Step 5g: Store transaction data if detected
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
              subject: metadata.subject,
              matchedPattern: !!finwiseAnalysis
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
      
      // Step 6: Update the last sync time
      await updateLastSyncTime(payload.userId, new Date());
      
      return {
        success: true,
        message: `Processed ${allStats.processedCount} emails, skipped ${allStats.skippedCount} already processed emails, encountered ${allStats.errorCount} errors, out of ${allStats.totalFound} total emails found since ${startDate.toISOString()}`,
        ...allStats,
        syncStartDate: startDate,
        isFirstSync,
        hasMorePages: false,
        nextPageToken: null
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