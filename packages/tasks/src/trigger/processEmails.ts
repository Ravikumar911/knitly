import { logger, task, wait, configure, batch } from "@trigger.dev/sdk/v3";
import { refreshGoogleToken, fetchGmailMessages, fetchGmailMessage, extractEmailBody, extractEmailMetadata, buildMerchantBasedGmailSearchQuery, extractAttachments } from "../utils";
import { finwiseAIV2Agent } from "../agents/finwiseAIV2";
import { processAttachments } from "../utils/emailStorage";
import { detectDuplicateTransactionsForUser } from "./duplicateDetector";
import { 
  getLastSyncTime, 
  updateLastSyncTime, 
  markSyncComplete,
  markSyncInProgress,
  markSyncFailed,
  markSyncCountingEmails,
  isEmailProcessed, 
  storeEmailData,
  updateEmailData,
  updateSyncProgress,
  getSyncProgress,
  initializeSync
} from "@workspace/database";

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

// Constants for optimization
const BATCH_SIZE = 20; // Process 20 emails per batch
const MAX_CONCURRENT_BATCHES = 5; // Run 5 batches in parallel
const RATE_LIMIT_DELAY = 0.1; // 0.1 seconds delay between API calls
const SYNC_PERIOD_DAYS = 180; // 180 days of email history to process (increased for better testing)

/**
 * Worker task that processes a batch of emails
 */
export const processEmailBatch = task({
  id: "process-email-batch",
  maxDuration: 1800,
  machine: "medium-2x", // 2 vCPU, 4GB RAM
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: {
    userId: string;
    providerToken: string;
    messages: Array<{id: string; threadId?: string}>;
  }) => {
    logger.log("Starting batch processing", {
      userId: payload.userId,
      batchSize: payload.messages.length,
      firstMessageId: payload.messages[0]?.id,
      lastMessageId: payload.messages[payload.messages.length - 1]?.id
    });

    const stats = {
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      totalFound: payload.messages.length
    };

    // Process messages in batch
    for (const messageInfo of payload.messages) {
      try {
        // Skip already processed emails
        const alreadyProcessed = await isEmailProcessed(payload.userId, messageInfo.id);
        if (alreadyProcessed) {
          stats.skippedCount++;
          continue;
        }

        // Fetch message with rate limiting
        await wait.for({ seconds: RATE_LIMIT_DELAY });
        const messageData = await fetchGmailMessage(payload.providerToken, messageInfo.id);
        
        if (!messageData) {
          stats.errorCount++;
          continue;
        }

        // Extract and process message data
        const metadata = extractEmailMetadata(messageData);
        const emailBody = extractEmailBody(messageData);
        const attachments = extractAttachments(messageData);

        // Process attachments if present
        let attachmentStoragePaths: string[] | null = null;
        let processedAttachments: Array<{
          filename: string;
          mimeType: string;
          content: string;
        }> | undefined = undefined;

        if (attachments.length > 0) {
          const attachmentResult = await processAttachments(
            payload.userId,
            messageInfo.id,
            payload.providerToken,
            attachments
          );

          if (attachmentResult) {
            attachmentStoragePaths = attachmentResult.storagePaths;
            processedAttachments = attachmentResult.processedAttachments;
          }
        }

        // Store email data first to get the email ID
        const storedEmail = await storeEmailData({
          threadId: messageData.threadId || null,
          userId: payload.userId,
          subject: metadata.subject || null,
          senderEmailId: metadata.from || null,  
          receivedDate: metadata.receivedDate || new Date(),
          snippet: metadata.snippet || null,
          parseSuccess: false,
          parseErrors: null,
          rawContent: emailBody || '',
          attachmentStoragePath: attachmentStoragePaths ? JSON.stringify(attachmentStoragePaths) : null,
          parsedAt: new Date()
        });

        if (!storedEmail || storedEmail.length === 0) {
          logger.error("Failed to store email data", {
            messageId: messageInfo.id,
            userId: payload.userId,
            threadId: messageData.threadId
          });
          stats.errorCount++;
          continue;
        }

        const emailRecord = storedEmail[0];
        if (!emailRecord) {
          stats.errorCount++;
          continue;
        }

        const emailId = emailRecord.id;

        // Prepare email data for V2 processing
        const emailData = {
          userId: payload.userId,
          emailId: emailId,
          threadId: messageData.threadId || '',
          subject: metadata.subject,
          from: metadata.from,
          date: metadata.date,
          body: emailBody,
          attachments: processedAttachments
        };

        // Process with V2 AI
        let finwiseV2Result: any = null;

        try {
          logger.log("Processing email with AI", {
            emailId,
            messageId: messageInfo.id,
            hasAttachments: processedAttachments ? processedAttachments.length : 0
          });

          finwiseV2Result = await finwiseAIV2Agent(emailData);
          
          if (finwiseV2Result?.transactionId) {
            logger.log("Transaction extracted successfully", { 
              emailId,
              transactionId: finwiseV2Result.transactionId,
              merchantId: finwiseV2Result.merchantId,
              schemaUsed: finwiseV2Result.schemaUsed
            });
          } else if (finwiseV2Result?.parseSuccess) {
            logger.log("Email processed but no transaction found", {
              emailId,
              reason: finwiseV2Result.noTransactionReason || 'Unknown'
            });
          }
        } catch (error) {
          logger.error("AI processing failed", {
            emailId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          stats.errorCount++;
          continue;
        }

        // Update email data with V2 results
        await updateEmailData(emailId, {
          parseSuccess: finwiseV2Result?.parseSuccess || false,
          parseErrors: finwiseV2Result?.parseErrors?.join(', ') || null,
        });

        stats.processedCount++;
      } catch (error) {
        logger.error("Batch message processing failed", {
          messageId: messageInfo.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          currentStats: stats
        });
        stats.errorCount++;
      }
    }

    await updateSyncProgress(payload.userId, stats.processedCount+stats.skippedCount+stats.errorCount);

    logger.log("Batch processing completed", {
      userId: payload.userId,
      batchStats: stats,
      successRate: `${((stats.processedCount / stats.totalFound) * 100).toFixed(1)}%`,
      errorRate: `${((stats.errorCount / stats.totalFound) * 100).toFixed(1)}%`,
      skipRate: `${((stats.skippedCount / stats.totalFound) * 100).toFixed(1)}%`
    });

    return stats;
  }
});

/**
 * Main coordinator task that splits emails into batches and processes them in parallel
 */
export const processEmails = task({
  id: "process-emails",
  maxDuration: 3600,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: {
    userId: string;
    syncPeriodDays?: number;
  }) => {
    const syncPeriodDays = payload.syncPeriodDays || SYNC_PERIOD_DAYS;
    
    logger.log("Initializing email sync", { 
      userId: payload.userId,
      syncPeriodDays,
      timestamp: new Date().toISOString()
    });
    
    try {
      
      const searchQuery = buildMerchantBasedGmailSearchQuery();
      const lastSyncTime = await getLastSyncTime(payload.userId);
      const startDate = lastSyncTime || new Date(Date.now() - (syncPeriodDays * 24 * 60 * 60 * 1000));
      const isFirstSync = !lastSyncTime;

      logger.log("Sync parameters determined", {
        userId: payload.userId,
        isFirstSync,
        lastSyncTime: lastSyncTime,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        searchQuery
      });
      
      const providerToken = await refreshGoogleToken(payload.userId);
      if (!providerToken) {
        const error = "Failed to refresh provider token";
        logger.error("Token refresh failed", {
          userId: payload.userId,
          timestamp: new Date().toISOString()
        });
        await markSyncFailed(payload.userId, error);
        return {
          success: false,
          message: error,
          error: "PROVIDER_TOKEN_REFRESH_FAILED"
        };
      }
  
      const endDate = new Date();
      
      // Mark sync as starting
      await markSyncInProgress(payload.userId);
      
      // Step 3: Fetch all messages  
      let allMessages: Array<{id: string; threadId?: string}> = [];
      let nextPageToken = null;
      let pageCount = 0;

      logger.log("Starting Gmail message fetch", {
        userId: payload.userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        searchQuery
      });

      while (true) {
        pageCount++;
        logger.log("Fetching Gmail page", {
          userId: payload.userId,
          pageNumber: pageCount,
          hasNextPageToken: !!nextPageToken
        });

        try {
          const gmailData = await fetchGmailMessages(providerToken, {
            after: startDate,
            before: endDate,
            pageToken: nextPageToken || undefined,
            query: searchQuery || undefined
          });

          if (!gmailData) {
            const error = `Failed to fetch Gmail messages at page ${pageCount}`;
            logger.error("Gmail fetch failed", {
              userId: payload.userId,
              pageNumber: pageCount,
              error
            });
            await markSyncFailed(payload.userId, error);
            return { success: false, message: error, error: "GMAIL_FETCH_FAILED" };
          }

          if (gmailData.messages) {
            const validMessages = gmailData.messages
              .filter((msg): msg is {id: string; threadId?: string} => 
                typeof msg.id === 'string'
              );
            allMessages = [...allMessages, ...validMessages];
            
            logger.log("Gmail page processed", {
              userId: payload.userId,
              pageNumber: pageCount,
              messagesInPage: validMessages.length,
              totalMessagesSoFar: allMessages.length
            });
          }

          if (!gmailData.nextPageToken) break;
          nextPageToken = gmailData.nextPageToken;
          await wait.for({ seconds: RATE_LIMIT_DELAY });
          
        } catch (error) {
          const errorMessage = `Gmail API error at page ${pageCount}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error("Gmail API error during fetch", {
            userId: payload.userId,
            pageNumber: pageCount,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          await markSyncFailed(payload.userId, errorMessage);
          return { 
            success: false, 
            message: errorMessage, 
            error: "GMAIL_API_ERROR",
            errorType: "GMAIL_FETCH_ERROR"
          };
        }
      }

      // Mark as counting emails and initialize sync with total count
      await markSyncCountingEmails(payload.userId);
      await initializeSync(payload.userId, allMessages.length);

      logger.log("Messages fetched successfully", {
        userId: payload.userId,
        totalMessages: allMessages.length,
        batchCount: Math.ceil(allMessages.length / BATCH_SIZE),
        concurrentBatches: MAX_CONCURRENT_BATCHES
      });

      // Step 4: Split messages into batches and process in parallel
      const batches = [];
      for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
        const batchMessages = allMessages.slice(i, i + BATCH_SIZE);
        batches.push({
          task: processEmailBatch,
          payload: {
            userId: payload.userId,
            providerToken,
            messages: batchMessages
          }
        });
      }

      // Process batches in parallel with concurrency limit
      const results = [];
      let cumulativeProcessed = 0;
      
      for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
        const batchNumber = Math.floor(i / MAX_CONCURRENT_BATCHES) + 1;
        const totalBatchGroups = Math.ceil(batches.length / MAX_CONCURRENT_BATCHES);
        
        logger.log("Processing batch group", {
          userId: payload.userId,
          batchGroup: batchNumber,
          totalGroups: totalBatchGroups,
          batchesInGroup: Math.min(MAX_CONCURRENT_BATCHES, batches.length - i),
          overallProgress: `${((i / batches.length) * 100).toFixed(1)}%`
        });

        const batchSlice = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
        const batchResults = await batch.triggerByTaskAndWait(batchSlice);
        results.push(...batchResults.runs);
        
        // Update progress
        for (const result of batchResults.runs) {
          if (result.ok) {
            cumulativeProcessed += result.output.processedCount;
          }
        }
      }

      // Aggregate final results
      const totalStats = {
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        totalFound: allMessages.length,
        batchFailures: 0
      };

      for (const result of results) {
        if (result.ok) {
          totalStats.processedCount += result.output.processedCount;
          totalStats.skippedCount += result.output.skippedCount;
          totalStats.errorCount += result.output.errorCount;
        } else {
          totalStats.batchFailures++;
          logger.error("Batch processing failed", {
            userId: payload.userId,
            batchError: result.error,
            runId: result.id
          });
        }
      }

      // Check if there were any critical failures that should prevent sync completion
      if (totalStats.batchFailures > 0) {
        const error = `Sync partially failed: ${totalStats.batchFailures} batch(es) failed out of ${results.length} total batches`;
        logger.error("Partial sync failure detected", {
          userId: payload.userId,
          batchFailures: totalStats.batchFailures,
          totalBatches: results.length,
          processedEmails: totalStats.processedCount
        });
        
        await markSyncFailed(payload.userId, error);
        
        return {
          success: false,
          message: error,
          error: "PARTIAL_BATCH_FAILURE",
          ...totalStats,
          syncStartDate: startDate,
          isFirstSync
        };
      }

      // Only update sync completion if all batches succeeded
      await updateLastSyncTime(payload.userId, new Date());
      await markSyncComplete(payload.userId);

      // Trigger duplicate detection for this specific user
      await detectDuplicateTransactionsForUser.trigger({ userId: payload.userId });

      logger.log("Email sync completed successfully", {
        userId: payload.userId,
        duration: `${((Date.now() - startDate.getTime()) / 1000 / 60).toFixed(1)} minutes`,
        stats: {
          ...totalStats,
          successRate: `${((totalStats.processedCount / totalStats.totalFound) * 100).toFixed(1)}%`,
          errorRate: `${((totalStats.errorCount / totalStats.totalFound) * 100).toFixed(1)}%`,
          skipRate: `${((totalStats.skippedCount / totalStats.totalFound) * 100).toFixed(1)}%`,
          batchFailureRate: `${((totalStats.batchFailures / results.length) * 100).toFixed(1)}%`
        },
        syncPeriod: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          isFirstSync
        },
        batchInfo: {
          totalBatches: results.length,
          successfulBatches: results.length - totalStats.batchFailures,
          failedBatches: totalStats.batchFailures
        }
      });

      return {
        success: true,
        message: `Processed ${totalStats.processedCount} emails, skipped ${totalStats.skippedCount} already processed emails, encountered ${totalStats.errorCount} errors, out of ${totalStats.totalFound} total emails found since ${startDate.toISOString()}. All ${results.length} batches completed successfully.`,
        ...totalStats,
        syncStartDate: startDate,
        isFirstSync,
        reconciliationTriggered: true,
        batchInfo: {
          totalBatches: results.length,
          successfulBatches: results.length,
          failedBatches: 0
        }
      };

    } catch (error) {
      logger.error("Critical sync error", {
        userId: payload.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      await markSyncFailed(payload.userId, error instanceof Error ? error.message : String(error));
      
      return {
        success: false,
        message: "Email processing failed with a critical error",
        error: error instanceof Error ? error.message : String(error),
        errorType: "CRITICAL_PROCESSING_ERROR"
      };
    }
  }
});