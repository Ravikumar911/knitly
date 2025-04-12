import { logger, task, wait, configure } from "@trigger.dev/sdk/v3";
import { refreshGoogleToken, fetchGmailMessages, fetchGmailMessage, extractEmailBody, extractEmailMetadata, buildGmailSearchQuery, extractAttachments } from "../utils";
import { finwiseAIAgent } from "../agents/finwiseAI";
import { processAttachments } from "../utils/emailStorage";
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
      
      // Step 2: Determine sync period
      const lastSyncTime = await getLastSyncTime(payload.userId);
      const startDate = lastSyncTime || new Date(Date.now() - (syncPeriodDays * 24 * 60 * 60 * 1000));
      const isFirstSync = !lastSyncTime;
      
      logger.log("Starting email sync", { 
        userId: payload.userId,
        syncPeriodDays,
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
          if (!messageInfo.id) {
            logger.error("Skipping message with no ID", { message: messageInfo });
            stats.skippedCount++;
            continue;
          }
          try {
            // Step 5a: Skip already processed emails
            const alreadyProcessed = await isEmailProcessed(payload.userId, messageInfo.id);
            if (alreadyProcessed) {
              logger.log("Skipping already processed email", { messageId: messageInfo.id });
              stats.skippedCount++;
              continue;
            }
            
            // Step 5b: Fetch message details
            const messageData = await fetchGmailMessage(providerToken, messageInfo.id);
            
            if (!messageData) {
              logger.error("Failed to fetch message details", { messageId: messageInfo.id });
              stats.errorCount++;
              continue;
            }
            
            // Step 5c: Extract message metadata and check for attachments
            const metadata = extractEmailMetadata(messageData);
            const emailBody = extractEmailBody(messageData);
            const attachments = extractAttachments(messageData);
            
            // Step 5d: Process attachments if present
            let attachmentStoragePaths: string[] | null = null;
            if (attachments.length > 0) {
              attachmentStoragePaths = await processAttachments(
                payload.userId,
                messageInfo.id || '',
                providerToken,
                attachments
              );

              if (!attachmentStoragePaths) {
                logger.error("Failed to process attachments", {
                  messageId: messageInfo.id,
                  attachmentCount: attachments.length
                });
              }
            }
            
            // Step 5e: Process with AI
            const finwiseAnalysis = await finwiseAIAgent({
              userId: payload.userId,
              threadId: messageData.threadId || '',
              subject: metadata.subject,
              from: metadata.from,
              date: metadata.date,
              body: emailBody,
              attachments: messageData.payload?.parts?.map(part => ({
                filename: part.filename || '',
                mimeType: part.mimeType || '',
                storagePath: part.body?.attachmentId || ''
              })) || []
            });
            
            // Step 5f: Store email data
            const storedEmail = await storeEmailData({
              threadId: messageData.threadId || null,
              userId: payload.userId,
              subject: metadata.subject || null,
              senderEmailId: metadata.from || null,  
              receivedDate: metadata.receivedDate || new Date(),
              snippet: metadata.snippet || null,
              parseSuccess: finwiseAnalysis.parseSuccess || null,
              parseErrors: finwiseAnalysis.parseErrors?.join(', ') || null,
              rawContent: emailBody || '',
              attachmentStoragePath: attachmentStoragePaths ? JSON.stringify(attachmentStoragePaths) : null,
              sender: metadata.from || null,
              parsedAt: new Date()
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
                  type: transaction.type || 'DEBIT',
                  status: transaction.status || 'COMPLETED',
                  transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate) : metadata.receivedDate,
                  valueDate: null,
                  description: transaction.description || '',
                  notes: null,
                  category: transaction.category || null,
                  merchantId: null,
                  merchantName: transaction.merchantName || null,
                  merchantCategory: transaction.merchantCategory || null,
                  instrumentId: null,
                  orderId: transaction.orderId || null,
                  orderItems: transaction.orderItems || null,
                  deliveryAddress: transaction.deliveryAddress || null,
                  paymentMethod: transaction.paymentMethod || null,
                  referenceIds: transaction.referenceIds || {},
                  location: transaction.location || null,
                  isVerified: false,
                  verificationStatus: 'UNVERIFIED',
                  aiAnalysisId: null
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