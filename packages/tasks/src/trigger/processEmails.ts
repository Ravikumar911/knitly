import { logger, task, wait, configure, batch } from "@trigger.dev/sdk/v3";
import { refreshGoogleToken, fetchGmailMessages, fetchGmailMessage, extractEmailBody, extractEmailMetadata, buildMerchantBasedGmailSearchQuery, extractAttachments, getGmailEmailCount } from "../utils";
import { finwiseAIV2Agent } from "../agents/finwiseAIV2";
import { processAttachments } from "../utils/emailStorage";
import { detectDuplicateTransactions } from "./duplicateDetector";
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
const SYNC_PERIOD_DAYS = 30; // 30 days of email history to process (increased for better testing)

/**
 * Worker task that processes a batch of emails
 */
export const processEmailBatch = task({
  id: "process-email-batch",
  maxDuration: 1800, // 30 mins per batch
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

        logger.log("Processing email", {
          messageId: messageInfo.id,
          from: metadata.from,
          subject: metadata.subject?.substring(0, 50) + '...'
        });

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
          parseSuccess: false, // Will be updated after V2 processing
          parseErrors: null,
          rawContent: emailBody || '',
          attachmentStoragePath: attachmentStoragePaths ? JSON.stringify(attachmentStoragePaths) : null,
          parsedAt: new Date()
        });

        if (!storedEmail || storedEmail.length === 0) {
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
          emailId: emailId, // Add email ID for linking
          threadId: messageData.threadId || '',
          subject: metadata.subject,
          from: metadata.from,
          date: metadata.date,
          body: emailBody,
          attachments: processedAttachments
        };

        // Process with V2 AI
        let finwiseV2Result: any = null;
        let v2Success = false;

        try {
          logger.log("Processing with V2 system", { messageId: messageInfo.id, emailId });
          finwiseV2Result = await finwiseAIV2Agent(emailData);
          v2Success = true;
          logger.log("V2 processing completed", { 
            messageId: messageInfo.id,
            emailId,
            parseSuccess: finwiseV2Result.parseSuccess,
            merchantId: finwiseV2Result.merchantId,
            schemaUsed: finwiseV2Result.schemaUsed
          });
        } catch (error) {
          logger.error("V2 processing failed", {
            messageId: messageInfo.id,
            emailId,
            error: error instanceof Error ? error.message : String(error)
          });
          stats.errorCount++;
          continue;
        }

        // Update email data with V2 results
        await updateEmailData(emailId, {
          parseSuccess: finwiseV2Result?.parseSuccess || false,
          parseErrors: finwiseV2Result?.parseErrors?.join(', ') || null,
        });

        // Log V2 transaction storage (already handled by finwiseAIV2Agent)
        if (finwiseV2Result?.transactionId) {
          logger.log("V2 transaction stored successfully", { 
            messageId: messageInfo.id,
            emailId,
            transactionId: finwiseV2Result.transactionId,
            merchantId: finwiseV2Result.merchantId,
            schemaUsed: finwiseV2Result.schemaUsed
          });
        }

        stats.processedCount++;
      } catch (error) {
        logger.error("Error processing message in batch", {
          messageId: messageInfo.id,
          error: error instanceof Error ? error.message : String(error)
        });
        stats.errorCount++;
      }
    }

    return stats;
  }
});

/**
 * Main coordinator task that splits emails into batches and processes them in parallel
 */
export const processEmails = task({
  id: "process-emails",
  maxDuration: 3600, // 1 hour total
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
    
    logger.log("Starting email sync with V2 processing", { 
      userId: payload.userId,
      syncPeriodDays
    });
    
    try {
      // Step 1: Initial setup and immediate sync status
      await markSyncInProgress(payload.userId);
      
      const searchQuery = buildMerchantBasedGmailSearchQuery();
      const lastSyncTime = await getLastSyncTime(payload.userId);
      const startDate = lastSyncTime || new Date(Date.now() - (syncPeriodDays * 24 * 60 * 60 * 1000));
      const isFirstSync = !lastSyncTime;
      
      // Step 2: Get provider token FAST
      logger.log("Getting provider token", { userId: payload.userId });
      const providerToken = await refreshGoogleToken(payload.userId);
      if (!providerToken) {
        await markSyncFailed(payload.userId, "Failed to refresh provider token");
        return {
          success: false,
          message: "Failed to refresh provider token",
          error: "PROVIDER_TOKEN_REFRESH_FAILED"
        };
      }

      // Step 2.5: Get Gmail email count IMMEDIATELY and update status
      logger.log("Getting Gmail email count - FAST TRACK", { userId: payload.userId });
      
      // Update status to show we're counting emails
      await markSyncCountingEmails(payload.userId);
      
      // Debug the date calculation
      const today = new Date();
      logger.log("Date calculation debug", {
        userId: payload.userId,
        lastSyncTime,
        isFirstSync,
        today: today.toISOString(),
        startDate: startDate.toISOString(),
        syncPeriodDays,
        todayFormatted: today.toISOString().split('T')[0],
        startDateFormatted: startDate.toISOString().split('T')[0]
      });
      
      // Ensure we don't have the same date for before and after
      const endDate = new Date();
      if (startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0]) {
        // If startDate is today, set startDate to yesterday to avoid same-day issue
        startDate.setDate(startDate.getDate() - 1);
        logger.log("Adjusted startDate to avoid same-day issue", {
          userId: payload.userId,
          adjustedStartDate: startDate.toISOString()
        });
      }
      
      const totalEmailCount = await getGmailEmailCount(providerToken, {
        after: startDate,
        before: endDate
      });
      
      logger.log("Gmail email count retrieved - INITIALIZING SYNC", { 
        userId: payload.userId,
        totalEmailCount,
        dateRange: { 
          from: startDate.toISOString(), 
          to: endDate.toISOString(),
          fromFormatted: startDate.toISOString().split('T')[0],
          toFormatted: endDate.toISOString().split('T')[0]
        }
      });
      
      // Initialize sync with the total count IMMEDIATELY
      await initializeSync(payload.userId, totalEmailCount);
      
      logger.log("Sync initialized with email count - UI SHOULD UPDATE NOW", { 
        userId: payload.userId,
        totalEmailCount 
      });

      // Step 3: Fetch all messages first
      let allMessages: Array<{id: string; threadId?: string}> = [];
      let nextPageToken = null;

      while (true) {
        const gmailData = await fetchGmailMessages(providerToken, {
          after: startDate,
          before: endDate,
          pageToken: nextPageToken || undefined,
          query: searchQuery || undefined
        });

        if (!gmailData) {
          await markSyncFailed(payload.userId, "Failed to fetch Gmail messages");
          return { success: false, message: "Failed to fetch Gmail messages", error: "GMAIL_FETCH_FAILED" };
        }

        if (gmailData.messages) {
          // Ensure we only take messages with valid IDs
          const validMessages = gmailData.messages
            .filter((msg): msg is {id: string; threadId?: string} => 
              typeof msg.id === 'string'
            );
          allMessages = [...allMessages, ...validMessages];
        }

        if (!gmailData.nextPageToken) break;
        nextPageToken = gmailData.nextPageToken;
        await wait.for({ seconds: RATE_LIMIT_DELAY });
      }

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
        const batchSlice = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
        const batchResults = await batch.triggerByTaskAndWait(batchSlice);
        results.push(...batchResults.runs);
        
        // Update progress after each batch group
        for (const result of batchResults.runs) {
          if (result.ok) {
            cumulativeProcessed += result.output.processedCount;
          }
        }
        
        // Update sync progress in database
        try {
          await updateSyncProgress(payload.userId, cumulativeProcessed);
          logger.log("Progress updated", {
            userId: payload.userId,
            processed: cumulativeProcessed,
            total: allMessages.length,
            percentage: ((cumulativeProcessed / allMessages.length) * 100).toFixed(2)
          });
        } catch (error) {
          logger.error("Failed to update progress", {
            userId: payload.userId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Aggregate results
      const totalStats = {
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        totalFound: allMessages.length
      };

      for (const result of results) {
        if (result.ok) {
          totalStats.processedCount += result.output.processedCount;
          totalStats.skippedCount += result.output.skippedCount;
          totalStats.errorCount += result.output.errorCount;
        }
      }

      // Update sync time and complete
      await updateLastSyncTime(payload.userId, new Date());
      await markSyncComplete(payload.userId);

      // Trigger duplicate detection
      const duplicateDetectionHandle = await detectDuplicateTransactions.trigger();
      logger.log("Triggered duplicate detection", { runId: duplicateDetectionHandle.id });

      // Build success message
      const message = `Processed ${totalStats.processedCount} emails, skipped ${totalStats.skippedCount} already processed emails, encountered ${totalStats.errorCount} errors, out of ${totalStats.totalFound} total emails found since ${startDate.toISOString()}`;

      logger.log("Email sync completed successfully", {
        userId: payload.userId,
        totalStats
      });

      return {
        success: true,
        message,
        ...totalStats,
        syncStartDate: startDate,
        isFirstSync,
        reconciliationTriggered: true
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
  }
});

// const response = {
//   "message": {
//     "id": "19622c101e77a680",
//     "snippet": "Greetings from Swiggy👋 Your Swiggy Instamart order id: 203308138905999 was successfully delivered. Deliver To: D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India Order Items 2 x",
//     "threadId": "19622c101e77a680",
//     "historyId": "14192952",
//     "internalDate": "1744339795000",
//     "labelIds": [
//       "CATEGORY_UPDATES",
//       "INBOX"
//     ],
//     "sizeEstimate": 72827,
//     "payload": {
//       "partId": "",
//       "filename": "",
//       "mimeType": "multipart/mixed",
//       "body": {
//         "size": 0
//       },
//       "headers": [
//         {
//           "name": "Delivered-To",
//           "value": "ravi.911kumar@gmail.com"
//         },
//         {
//           "name": "Received",
//           "value": "by 2002:a05:6850:3b4d:b0:637:cd65:2d65 with SMTP id u13csp90810nnt;        Thu, 10 Apr 2025 19:49:56 -0700 (PDT)"
//         },
//         {
//           "name": "X-Google-Smtp-Source",
//           "value": "AGHT+IErOfLCqRs9bYfSsHCy7MUBoYgkY0H4MoGDn5JIIP2yARduUGdHtL5xSw61GqITgcwQUHO2"
//         },
//         {
//           "name": "X-Received",
//           "value": "by 2002:a05:6a20:12d4:b0:1f5:591b:4f73 with SMTP id adf61e73a8af0-20179969b8amr2007852637.34.1744339796350;        Thu, 10 Apr 2025 19:49:56 -0700 (PDT)"
//         },
//         {
//           "name": "ARC-Seal",
//           "value": "i=1; a=rsa-sha256; t=1744339796; cv=none;        d=google.com; s=arc-20240605;        b=KooWFaarLdb9xUKiMmLOOzXQ1KLjry3Zitgvq/Hvb8flSsP60cCguZV5FHdd/j6mm7         WpARIYsl6GFVg6JAlG4G64ciHDsUu4z+Fg60SZyOK0iPmud4dOnsGX1afLAJOOhkTdP6         T9zm87lNJ5Sm6IM7gbnieLT7tNLC8W5OqlAO/g+Psb813XQcuJ1HUsjFncSCO5suvzmL         Q4ghy0qL7tp2CRDNEbmxle27RLXd+ai4k42FBBgacQJ0yrgPew5RAO5JCHe19F7vxfr4         0K0V3RFqT90K96VexG8wQZccAUWddY0wIuicNGML2o7zTXGJs3jL0FOOtNG/VOX39ENa         m1hw=="
//         },
//         {
//           "name": "ARC-Message-Signature",
//           "value": "i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240605;        h=feedback-id:date:mime-version:subject:message-id:to:from         :dkim-signature:dkim-signature;        bh=f4AWwCLy1W/MMV9DQxjeYfCXAgHbKETDTJiPBuHhleo=;        fh=Y7oUzj+8lhLDtdwdE+rGaR5IEKln2KliatOAAN03vfk=;        b=Kt4tbgNrdw7B8lNF0uhYobpkTU9mY+CX7Hg5jFAbb38j14zUjzNagOUHvFsWiw17Q4         eb0EoX/Z//BGdaMXelUFkun71KsfV+bF+n6bA4Xz1CuAuvw9ccBK4fgxfbiG9fRwOJGL         prBXO00bGkaWDzKYRXtrWTjfFrRVeQd27Yjel7hUZE8TfhFsuduuWFygzPdaMMuLUQ7y         FnlOeeKh2bw9ff/6njSVf0GpAAEozjnglbNCQ5msWV3bXbRIkl2AT6FJMZLGcd7X1s81         wzuAoTOteNRCReC4pIOk/n6GCYAbuGZW0zlhcrinwJiZYdn/it490n0aq27EZdvFbKMd         UvqQ==;        dara=google.com"
//         },
//         {
//           "name": "ARC-Authentication-Results",
//           "value": "i=1; mx.google.com;       dkim=pass header.i=@swiggy.in header.s=hzpghd5ihtmth46iqp7a5vayizkzpwbs header.b=ZzrxqaDD;       dkim=pass header.i=@amazonses.com header.s=gdwg2y3kokkkj5a55z2ilkup5wp5hhxx header.b=WaINBE7l;       spf=pass (google.com: domain of 0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in designates 54.240.27.113 as permitted sender) smtp.mailfrom=0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in;       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=swiggy.in"
//         },
//         {
//           "name": "Return-Path",
//           "value": "<0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in>"
//         },
//         {
//           "name": "Received",
//           "value": "from a27-113.smtp-out.us-west-2.amazonses.com (a27-113.smtp-out.us-west-2.amazonses.com. [54.240.27.113])        by mx.google.com with ESMTPS id 41be03b00d2f7-b02a0a08518si5812201a12.144.2025.04.10.19.49.56        for <ravi.911kumar@gmail.com>        (version=TLS1_3 cipher=TLS_AES_128_GCM_SHA256 bits=128/128);        Thu, 10 Apr 2025 19:49:56 -0700 (PDT)"
//         },
//         {
//           "name": "Received-SPF",
//           "value": "pass (google.com: domain of 0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in designates 54.240.27.113 as permitted sender) client-ip=54.240.27.113;"
//         },
//         {
//           "name": "Authentication-Results",
//           "value": "mx.google.com;       dkim=pass header.i=@swiggy.in header.s=hzpghd5ihtmth46iqp7a5vayizkzpwbs header.b=ZzrxqaDD;       dkim=pass header.i=@amazonses.com header.s=gdwg2y3kokkkj5a55z2ilkup5wp5hhxx header.b=WaINBE7l;       spf=pass (google.com: domain of 0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in designates 54.240.27.113 as permitted sender) smtp.mailfrom=0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in;       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=swiggy.in"
//         },
//         {
//           "name": "DKIM-Signature",
//           "value": "v=1; a=rsa-sha256; q=dns/txt; c=relaxed/simple; s=hzpghd5ihtmth46iqp7a5vayizkzpwbs; d=swiggy.in; t=1744339796; h=From:To:Message-ID:Subject:MIME-Version:Content-Type:Date; bh=4Reozc7/aXp9cte+68wtAo1hpN5CTXgkA1GsVrUnq94=; b=ZzrxqaDDGC6WfWRLYzboNBA4518aEHZujwWaV7VFhkblXLFc9kp7ZovmyHuMWkDT jwyxGRX0lcOj2qcGozZaIwGstMu+ysqAWpUpWJrInlm7n5K+NptI1XrOdtvH1Tx5Hr2 7HdKzyUQH8fUMV5Q26Z+YfTS0/LJET6t7xVKXO9o="
//         },
//         {
//           "name": "DKIM-Signature",
//           "value": "v=1; a=rsa-sha256; q=dns/txt; c=relaxed/simple; s=gdwg2y3kokkkj5a55z2ilkup5wp5hhxx; d=amazonses.com; t=1744339796; h=From:To:Message-ID:Subject:MIME-Version:Content-Type:Date:Feedback-ID; bh=4Reozc7/aXp9cte+68wtAo1hpN5CTXgkA1GsVrUnq94=; b=WaINBE7lqTbH4fvpLp22pwPO4rRU5sSBg2QQd7tL17G2Aas80OFWhXi4jVaIEEcD MlXSgIR9aWuX1DGhDWHmwAvAxQpUDVQv92/vMxQ2Y5wyC/wx0V05518cXvgR7Q3vjTk OtfysIxCOwJt9pRJaa0cyHIftgWGTw8T5ZXIXANE="
//         },
//         {
//           "name": "From",
//           "value": "noreply@swiggy.in"
//         },
//         {
//           "name": "To",
//           "value": "ravi.911kumar@gmail.com"
//         },
//         {
//           "name": "Message-ID",
//           "value": "<0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@us-west-2.amazonses.com>"
//         },
//         {
//           "name": "Subject",
//           "value": "Your Swiggy Instamart order was successfully delivered"
//         },
//         {
//           "name": "MIME-Version",
//           "value": "1.0"
//         },
//         {
//           "name": "Content-Type",
//           "value": "multipart/mixed; boundary=\"----=_Part_547845_1181409714.1744339795809\""
//         },
//         {
//           "name": "Date",
//           "value": "Fri, 11 Apr 2025 02:49:55 +0000"
//         },
//         {
//           "name": "Feedback-ID",
//           "value": "::1.us-west-2.75hyjqWebDjudY7ErWu3G8hgzA6Vmd5Tcnb7tnuPJ+8=:AmazonSES"
//         },
//         {
//           "name": "X-SES-Outgoing",
//           "value": "2025.04.11-54.240.27.113"
//         }
//       ],
//       "parts": [
//         {
//           "partId": "0",
//           "filename": "",
//           "mimeType": "multipart/alternative",
//           "body": {
//             "size": 0
//           },
//           "headers": [
//             {
//               "name": "Content-Type",
//               "value": "multipart/alternative; boundary=\"----=_Part_547846_2066137498.1744339795809\""
//             }
//           ],
//           "parts": [
//             {
//               "partId": "0.0",
//               "filename": "",
//               "mimeType": "text/html",
//               "body": {
//                 "data": "PGhlYWQ-PHN0eWxlIHR5cGU9J3RleHQvY3NzJz4qIHttYXJnaW46IDM7Ym9yZGVyOiAxO3BhZGRpbmc6IDE7fSBAcGFnZSB7IHNpemU6IEEzIHBvcnRyYWl0OyBtYXJnaW46IDRtbSA0bW0gNG1tIDRtbTsgfTwvc3R5bGU-PC9oZWFkPiA8Ym9keSBzdHlsZT0nZm9udC1mYW1pbHk6IEFyaWFsO21hcmdpbjo0OyBwYWRkaW5nOiAyOyBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmOyc-IDx0YWJsZSBjZWxsc3BhY2luZz0nMCcgY2VsbHBhZGRpbmc9JzAnIHdpZHRoPScxMDAlJyBhbGlnbj0nbGVmdCcgYm9yZGVyPScwJz4gPHRyPiA8dGQgdmFsaWduPSd0b3AnIHN0eWxlPSd3aWR0aDogMTAwJTsgYm9yZGVyOiAwJz4gPHRhYmxlIGNlbGxzcGFjaW5nPScwJyBjZWxscGFkZGluZz0nMCcgd2lkdGg9JzEwMCUnIGFsaWduPSdsZWZ0Jz4gPHRyPiA8dGQ-Jm5ic3A7PC90ZD4gPHRkIHZhbGlnbj0ndG9wJyBhbGlnbj0nY2VudGVyJyB3aWR0aD0nMTAwJyBzdHlsZT0nYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjsnPjxpbWcgYWx0PSdTd2lnZ3knIHN0eWxlPSd3aWR0aDoyMDBweDsnIHNyYz0naHR0cHM6Ly9tZWRpYS1hc3NldHMuc3dpZ2d5LmNvbS93XzUwMC9wb3J0YWwvbS9icmFuZF9sb2dvcy9Td2lnZ3klMjBJbnN0YW1hcnQlMjBPcmFuZ2UucG5nJy8-PC90ZD4gPHRkPiZuYnNwOzwvdGQ-IDwvdHI-IDx0cj4gPHRkIHdpZHRoPSc1Jz4gJm5ic3A7Jm5ic3A7PC90ZD4gPHRkIHZhbGlnbj0ndG9wJz4gPHRhYmxlIGNlbGxzcGFjaW5nPScwJyBjZWxscGFkZGluZz0n",
//                 "size": 10687
//               },
//               "headers": [
//                 {
//                   "name": "Content-Type",
//                   "value": "text/html; charset=UTF-8"
//                 },
//                 {
//                   "name": "Content-Transfer-Encoding",
//                   "value": "quoted-printable"
//                 }
//               ]
//             }
//           ]
//         },
//         {
//           "partId": "1",
//           "filename": "taco/203308138905999_merged.pdf",
//           "mimeType": "application/octet-stream",
//           "body": {
//             "size": 40591,
//             "attachmentId": "ANGjdJ8crZEKHPRhmDUoX80jPq_iyBFjzGzBX6vhHPtlYi_ekJ8buiDBvZkezbV-8z20IRgZhKYqxTKzAVilj-rtw_PSfjj-c5_2FbyarEfRsGAZIUdJHikuXBwIhlTGdpTws3alwyaqFTzaLzWT8kB4xFZ9TkrM1QLQfDu23KFPM1_cjJgLsBsx8AUQbygVmUKf2NbzA4ow-rvAaf95ahVjLd0Gqv2HFrpVtpKF-ZLh_rOPQXuvDAB-zMm61JeqbTTB1xf2IQVDpFQfLhDPWJ3r68pZTc242gFa0L11b6JZl0fgNq9QywUVsto76ss00wj6dbC3Nm5wApvuvE1XPznU51AVprd2dO-5iYrbssnShqhHrs3p35czAZlvuwiwgzuNl11r62G4g4PDG55O"
//           },
//           "headers": [
//             {
//               "name": "Content-Type",
//               "value": "application/octet-stream; name=\"taco/203308138905999_merged.pdf\""
//             },
//             {
//               "name": "Content-Transfer-Encoding",
//               "value": "base64"
//             },
//             {
//               "name": "Content-Disposition",
//               "value": "attachment; filename=\"taco/203308138905999_merged.pdf\""
//             }
//           ]
//         }
//       ]
//     }
//   }
// }