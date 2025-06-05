import { logger } from "@trigger.dev/sdk/v3";
import { GmailMessage, GmailMessageList, GmailAttachment } from "../types/gmail";
import { google, gmail_v1 } from 'googleapis';
import { GmailAttachmentData } from "../types";
import { getMerchantEmailConfigs } from "../merchants";

// Create Gmail API client
const createGmailClient = (providerToken: string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: providerToken });
  return google.gmail({ version: 'v1', auth });
};

/**
 * Builds Gmail search query based on active merchants from the codebase
 * This replaces generic email extraction patterns with merchant-specific filtering
 */
export function buildMerchantBasedGmailSearchQuery(): string {
  try {
    const merchantConfigs = getMerchantEmailConfigs();
    
    if (merchantConfigs.length === 0) {
      logger.warn("No active merchants found for email filtering");
      return "";
    }

    const searchQueries: string[] = [];

    for (const merchant of merchantConfigs) {
      // Only use domain-based filtering
      if (merchant.domains && merchant.domains.length > 0) {
        const domainConditions = merchant.domains
          .map(domain => `from:${domain}`)
          .join(" OR ");
        
        if (domainConditions) {
          searchQueries.push(`(${domainConditions})`);
          
          logger.log("Added merchant to email filter", {
            merchantName: merchant.name,
            merchantId: merchant.id,
            domains: merchant.domains,
            query: domainConditions
          });
        }
      }
    }

    // Combine all merchant queries with OR
    const finalQuery = searchQueries.length > 0 ? searchQueries.join(" OR ") : "";
    
    logger.log("Built merchant-based Gmail search query", {
      merchantCount: merchantConfigs.length,
      queryLength: finalQuery.length,
      hasQuery: finalQuery.length > 0
    });

    return finalQuery;
  } catch (error) {
    logger.error("Failed to build merchant-based Gmail search query", {
      error: error instanceof Error ? error.message : String(error)
    });
    return "";
  }
}

/**
 * Builds Gmail search query from email extraction patterns (DEPRECATED)
 * @deprecated Use buildMerchantBasedGmailSearchQuery instead
 */
export async function buildGmailSearchQuery(patterns: any[]) {
  logger.warn("Using deprecated buildGmailSearchQuery - consider migrating to buildMerchantBasedGmailSearchQuery");
  
  const searchQueries = patterns
    .filter(p => p.isActive)
    .map(pattern => {
      const conditions = [];
      
      if (pattern.emailPattern) {
        conditions.push(`from:(${pattern.emailPattern})`);
      }
      
      if (pattern.subjectPattern) {
        conditions.push(`subject:(${pattern.subjectPattern})`);
      }
      
      return conditions.join(" AND ");
    })
    .filter(query => query.length > 0);

  // Combine all pattern queries with OR
  return searchQueries.length > 0 ? `{${searchQueries.join("} OR {")}}` : "";
}

/**
 * Fetches a list of Gmail messages with date filtering and pagination support
 */
export const fetchGmailMessages = async (
  providerToken: string, 
  options?: {
    after?: Date;  // Only fetch messages after this date
    before?: Date; // Only fetch messages before this date
    query?: string; // Additional query parameters
    pageToken?: string; // Token for pagination
    maxResults?: number; // Optional parameter to override default limit
  }
): Promise<GmailMessageList | null> => {
  try {
    let query = '';
    
    // Add date filters if provided
    if (options?.after) {
      query += ` after:${options.after.toISOString().split('T')[0]}`;
    }
    if (options?.before) {
      query += ` before:${options.before.toISOString().split('T')[0]}`;
    }
    if (options?.query) {
      query += ` ${options.query}`;
    }

    const gmail = createGmailClient(providerToken);
    
    logger.log('Fetching Gmail messages', { 
      limit: options?.maxResults || 10, 
      hasDateFilter: !!options?.after || !!options?.before,
      hasPaginationToken: !!options?.pageToken 
    });

    logger.log('Gmail search query', { query });

    // Make the API request using googleapis
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: options?.maxResults || 10,
      pageToken: options?.pageToken,
      q: query.trim() || undefined
    });

    logger.log('Gmail messages fetched successfully', { 
      count: response.data.messages?.length || 0,
      hasNextPage: !!response.data.nextPageToken,
      totalEstimate: response.data.resultSizeEstimate
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching Gmail messages:', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
};

/**
 * Fetches details for a specific Gmail message
 */
export const fetchGmailMessage = async (providerToken: string, messageId: string): Promise<GmailMessage | null> => {
  try {
    const gmail = createGmailClient(providerToken);
    
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    return response.data;
  } catch (error) {
    logger.error('Error fetching Gmail message details:', { 
      messageId,
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
};

/**
 * Extracts email body content from a Gmail message
 * @param messageData The Gmail message data
 * @returns The extracted text content of the email
 */
export const extractEmailBody = (messageData: GmailMessage): string => {
  if (!messageData || !messageData.payload) {
    return '';
  }

  // First, try to find a text/plain part
  if (messageData.payload.parts) {
    // Try to find text/plain first
    const textPart = messageData.payload.parts.find(
      part => part.mimeType === 'text/plain' && part.body?.data
    );
    
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
    
    // If no text/plain, try to find text/html
    const htmlPart = messageData.payload.parts.find(
      part => part.mimeType === 'text/html' && part.body?.data
    );
    
    if (htmlPart?.body?.data) {
      // Consider adding HTML to text conversion here if needed
      return Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
    }
    
    // Handle multipart/alternative or nested parts
    for (const part of messageData.payload.parts) {
      if (part.parts) {
        const nestedTextPart = part.parts.find(
          nestedPart => nestedPart.mimeType === 'text/plain' && nestedPart.body?.data
        );
        
        if (nestedTextPart?.body?.data) {
          return Buffer.from(nestedTextPart.body.data, 'base64').toString('utf-8');
        }
        
        const nestedHtmlPart = part.parts.find(
          nestedPart => nestedPart.mimeType === 'text/html' && nestedPart.body?.data
        );
        
        if (nestedHtmlPart?.body?.data) {
          return Buffer.from(nestedHtmlPart.body.data, 'base64').toString('utf-8');
        }
      }
    }
  }
  
  // Fallback: use message body if available
  if (messageData.payload.body?.data) {
    return Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
  }
  
  // Fallback: use snippet if available
  if (messageData.snippet) {
    return messageData.snippet;
  }
  
  return '';
};

/**
 * Extracts email metadata from Gmail message headers
 * @param messageData The Gmail message data
 * @returns Object containing metadata like subject, from, date, etc.
 */
export const extractEmailMetadata = (messageData: GmailMessage) => {
  if (!messageData || !messageData.payload || !messageData.payload.headers) {
    return {
      subject: 'No Subject',
      from: 'Unknown',
      senderEmailId: 'Unknown',
      to: 'Unknown',
      date: new Date().toISOString(),
      receivedDate: new Date(),
      snippet: '',
      threadId: '',
      messageId: '',
      labelIds: [],
      sizeEstimate: 0
    };
  }

  const headers = messageData.payload.headers;
  const subject = headers.find(h => h?.name?.toLowerCase() === 'subject')?.value || 'No Subject';
  const from = headers.find(h => h?.name?.toLowerCase() === 'from')?.value || 'Unknown';
  const to = headers.find(h => h?.name?.toLowerCase() === 'to')?.value || 'Unknown';
  const date = headers.find(h => h?.name?.toLowerCase() === 'date')?.value || '';
  
  // Parse date from headers or fall back to internalDate or current date
  let receivedDate: Date;
  try {
    receivedDate = date ? new Date(date) : (
      messageData.internalDate ? new Date(parseInt(messageData.internalDate)) : new Date()
    );
    
    if (isNaN(receivedDate.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (error) {
    // Fall back to internalDate which is a timestamp in milliseconds
    try {
      receivedDate = messageData.internalDate 
        ? new Date(parseInt(messageData.internalDate)) 
        : new Date();
        
      if (isNaN(receivedDate.getTime())) {
        throw new Error('Invalid internal date');
      }
    } catch {
      // Last resort: use current date
      receivedDate = new Date();
    }
  }
  
  return {
    subject,
    from,
    senderEmailId: from,
    to,
    date,
    receivedDate,
    snippet: messageData.snippet || '',
    threadId: messageData.threadId || '',
    messageId: messageData.id || '',
    labelIds: messageData.labelIds || [],
    sizeEstimate: messageData.sizeEstimate || 0
  };
};

/**
 * Extracts attachments from a Gmail message
 */
export function extractAttachments(message: GmailMessage): GmailAttachment[] {
  const attachments: GmailAttachment[] = [];
  logger.log('Extracting attachments from message');
  if (!message?.payload) {
    logger.warn('No message payload found when extracting attachments');
    return attachments;
  }

  function processMessagePart(part: gmail_v1.Schema$MessagePart) {
    // Base case: if no part, return early
    if (!part) {
      return;
    }

    // Check if current part is an attachment
    if (part.filename && part.filename.trim() !== '' && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
    }
    
    // Handle multipart messages by recursively processing each part
    if (Array.isArray(part.parts)) {
      part.parts.forEach((subPart) => {
        // Handle nested multipart messages
        if (subPart.mimeType?.startsWith('multipart/')) {
          processMessagePart(subPart);
        } else {
          // Handle individual part that might be an attachment
          if (subPart.filename && subPart.filename.trim() !== '' && subPart.body?.attachmentId) {
            attachments.push({
              filename: subPart.filename,
              mimeType: subPart.mimeType || 'application/octet-stream',
              size: subPart.body.size || 0,
              attachmentId: subPart.body.attachmentId,
            });
          }
          
          // If this part has nested parts, process them too
          if (Array.isArray(subPart.parts)) {
            subPart.parts.forEach(processMessagePart);
          }
        }
      });
    }
  }
  
  processMessagePart(message.payload);
  
  return attachments;
}

/**
 * Downloads a specific attachment from a Gmail message
 */
export const downloadAttachment = async (
  providerToken: string, 
  messageId: string, 
  attachmentId: string
): Promise<GmailAttachmentData | null> => {
  try {
    logger.log('Downloading Gmail attachment', { messageId, attachmentId });

    const gmail = createGmailClient(providerToken);
    
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId
    });

    logger.log('Gmail attachment downloaded successfully', { 
      messageId,
      attachmentId,
      size: response.data.size || 0
    });

    return {
      data: response.data.data || '',
      size: response.data.size || 0
    };
  } catch (error) {
    logger.error('Error downloading Gmail attachment:', { 
      messageId,
      attachmentId,
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
};

/**
 * Gets the total count of emails matching the merchant-based search criteria
 * This uses the same search query as the email processing to ensure accuracy
 */
export const getGmailEmailCount = async (
  providerToken: string, 
  options?: {
    after?: Date;  // Only count messages after this date
    before?: Date; // Only count messages before this date
  }
): Promise<number> => {
  try {
    // Build the same merchant-based query used in email processing
    const merchantQuery = buildMerchantBasedGmailSearchQuery();
    
    let query = merchantQuery;
    
    // Add date filters if provided (same as in fetchGmailMessages)
    if (options?.after) {
      query += ` after:${options.after.toISOString().split('T')[0]}`;
    }
    if (options?.before) {
      query += ` before:${options.before.toISOString().split('T')[0]}`;
    }

    logger.log('Getting Gmail email count with query', { query });

    const gmail = createGmailClient(providerToken);
    
    // Get just one message to get the resultSizeEstimate
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1, // We only need the count estimate
      q: query.trim() || undefined
    });

    const totalCount = response.data.resultSizeEstimate || 0;
    
    logger.log('Gmail email count retrieved', { 
      totalCount,
      query: query.trim()
    });
    
    return totalCount;
  } catch (error) {
    logger.error('Error getting Gmail email count:', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return 0;
  }
};

const sampleMessage = {
  "message": {
    "id": "19622c101e77a680",
    "snippet": "Greetings from Swiggy👋 Your Swiggy Instamart order id: 203308138905999 was successfully delivered. Deliver To: D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India Order Items 2 x",
    "threadId": "19622c101e77a680",
    "historyId": "14192952",
    "internalDate": "1744339795000",
    "labelIds": [
      "CATEGORY_UPDATES",
      "INBOX"
    ],
    "sizeEstimate": 72827,
    "payload": {
      "partId": "",
      "filename": "",
      "mimeType": "multipart/mixed",
      "body": {
        "size": 0
      },
      "headers": [
        {
          "name": "Delivered-To",
          "value": "ravi.911kumar@gmail.com"
        },
        {
          "name": "Received",
          "value": "by 2002:a05:6850:3b4d:b0:637:cd65:2d65 with SMTP id u13csp90810nnt;        Thu, 10 Apr 2025 19:49:56 -0700 (PDT)"
        },
        {
          "name": "X-Google-Smtp-Source",
          "value": "AGHT+IErOfLCqRs9bYfSsHCy7MUBoYgkY0H4MoGDn5JIIP2yARduUGdHtL5xSw61GqITgcwQUHO2"
        },
        {
          "name": "X-Received",
          "value": "by 2002:a05:6a20:12d4:b0:1f5:591b:4f73 with SMTP id adf61e73a8af0-20179969b8amr2007852637.34.1744339796350;        Thu, 10 Apr 2025 19:49:56 -0700 (PDT)"
        },
        {
          "name": "ARC-Seal",
          "value": "i=1; a=rsa-sha256; t=1744339796; cv=none;        d=google.com; s=arc-20240605;        b=KooWFaarLdb9xUKiMmLOOzXQ1KLjry3Zitgvq/Hvb8flSsP60cCguZV5FHdd/j6mm7         WpARIYsl6GFVg6JAlG4G64ciHDsUu4z+Fg60SZyOK0iPmud4dOnsGX1afLAJOOhkTdP6         T9zm87lNJ5Sm6IM7gbnieLT7tNLC8W5OqlAO/g+Psb813XQcuJ1HUsjFncSCO5suvzmL         Q4ghy0qL7tp2CRDNEbmxle27RLXd+ai4k42FBBgacQJ0yrgPew5RAO5JCHe19F7vxfr4         0K0V3RFqT90K96VexG8wQZccAUWddY0wIuicNGML2o7zTXGJs3jL0FOOtNG/VOX39ENa         m1hw=="
        },
        {
          "name": "ARC-Message-Signature",
          "value": "i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240605;        h=feedback-id:date:mime-version:subject:message-id:to:from         :dkim-signature:dkim-signature;        bh=f4AWwCLy1W/MMV9DQxjeYfCXAgHbKETDTJiPBuHhleo=;        fh=Y7oUzj+8lhLDtdwdE+rGaR5IEKln2KliatOAAN03vfk=;        b=Kt4tbgNrdw7B8lNF0uhYobpkTU9mY+CX7Hg5jFAbb38j14zUjzNagOUHvFsWiw17Q4         eb0EoX/Z//BGdaMXelUFkun71KsfV+bF+n6bA4Xz1CuAuvw9ccBK4fgxfbiG9fRwOJGL         prBXO00bGkaWDzKYRXtrWTjfFrRVeQd27Yjel7hUZE8TfhFsuduuWFygzPdaMMuLUQ7y         FnlOeeKh2bw9ff/6njSVf0GpAAEozjnglbNCQ5msWV3bXbRIkl2AT6FJMZLGcd7X1s81         wzuAoTOteNRCReC4pIOk/n6GCYAbuGZW0zlhcrinwJiZYdn/it490n0aq27EZdvFbKMd         UvqQ==;        dara=google.com"
        },
        {
          "name": "ARC-Authentication-Results",
          "value": "i=1; mx.google.com;       dkim=pass header.i=@swiggy.in header.s=hzpghd5ihtmth46iqp7a5vayizkzpwbs header.b=ZzrxqaDD;       dkim=pass header.i=@amazonses.com header.s=gdwg2y3kokkkj5a55z2ilkup5wp5hhxx header.b=WaINBE7l;       spf=pass (google.com: domain of 0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in designates 54.240.27.113 as permitted sender) smtp.mailfrom=0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in;       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=swiggy.in"
        },
        {
          "name": "Return-Path",
          "value": "<0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in>"
        },
        {
          "name": "Received",
          "value": "from a27-113.smtp-out.us-west-2.amazonses.com (a27-113.smtp-out.us-west-2.amazonses.com. [54.240.27.113])        by mx.google.com with ESMTPS id 41be03b00d2f7-b02a0a08518si5812201a12.144.2025.04.10.19.49.56        for <ravi.911kumar@gmail.com>        (version=TLS1_3 cipher=TLS_AES_128_GCM_SHA256 bits=128/128);        Thu, 10 Apr 2025 19:49:56 -0700 (PDT)"
        },
        {
          "name": "Received-SPF",
          "value": "pass (google.com: domain of 0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in designates 54.240.27.113 as permitted sender) client-ip=54.240.27.113;"
        },
        {
          "name": "Authentication-Results",
          "value": "mx.google.com;       dkim=pass header.i=@swiggy.in header.s=hzpghd5ihtmth46iqp7a5vayizkzpwbs header.b=ZzrxqaDD;       dkim=pass header.i=@amazonses.com header.s=gdwg2y3kokkkj5a55z2ilkup5wp5hhxx header.b=WaINBE7l;       spf=pass (google.com: domain of 0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in designates 54.240.27.113 as permitted sender) smtp.mailfrom=0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@partnerupdate.swiggy.in;       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=swiggy.in"
        },
        {
          "name": "DKIM-Signature",
          "value": "v=1; a=rsa-sha256; q=dns/txt; c=relaxed/simple; s=hzpghd5ihtmth46iqp7a5vayizkzpwbs; d=swiggy.in; t=1744339796; h=From:To:Message-ID:Subject:MIME-Version:Content-Type:Date; bh=4Reozc7/aXp9cte+68wtAo1hpN5CTXgkA1GsVrUnq94=; b=ZzrxqaDDGC6WfWRLYzboNBA4518aEHZujwWaV7VFhkblXLFc9kp7ZovmyHuMWkDT jwyxGRX0lcOj2qcGozZaIwGstMu+ysqAWpUpWJrInlm7n5K+NptI1XrOdtvH1Tx5Hr2 7HdKzyUQH8fUMV5Q26Z+YfTS0/LJET6t7xVKXO9o="
        },
        {
          "name": "DKIM-Signature",
          "value": "v=1; a=rsa-sha256; q=dns/txt; c=relaxed/simple; s=gdwg2y3kokkkj5a55z2ilkup5wp5hhxx; d=amazonses.com; t=1744339796; h=From:To:Message-ID:Subject:MIME-Version:Content-Type:Date:Feedback-ID; bh=4Reozc7/aXp9cte+68wtAo1hpN5CTXgkA1GsVrUnq94=; b=WaINBE7lqTbH4fvpLp22pwPO4rRU5sSBg2QQd7tL17G2Aas80OFWhXi4jVaIEEcD MlXSgIR9aWuX1DGhDWHmwAvAxQpUDVQv92/vMxQ2Y5wyC/wx0V05518cXvgR7Q3vjTk OtfysIxCOwJt9pRJaa0cyHIftgWGTw8T5ZXIXANE="
        },
        {
          "name": "From",
          "value": "noreply@swiggy.in"
        },
        {
          "name": "To",
          "value": "ravi.911kumar@gmail.com"
        },
        {
          "name": "Message-ID",
          "value": "<0101019622c0ffcc-d4d8889a-fd02-4744-873d-1c2c0bf88926-000000@us-west-2.amazonses.com>"
        },
        {
          "name": "Subject",
          "value": "Your Swiggy Instamart order was successfully delivered"
        },
        {
          "name": "MIME-Version",
          "value": "1.0"
        },
        {
          "name": "Content-Type",
          "value": "multipart/mixed; boundary=\"----=_Part_547845_1181409714.1744339795809\""
        },
        {
          "name": "Date",
          "value": "Fri, 11 Apr 2025 02:49:55 +0000"
        },
        {
          "name": "Feedback-ID",
          "value": "::1.us-west-2.75hyjqWebDjudY7ErWu3G8hgzA6Vmd5Tcnb7tnuPJ+8=:AmazonSES"
        },
        {
          "name": "X-SES-Outgoing",
          "value": "2025.04.11-54.240.27.113"
        }
      ],
      "parts": [
        {
          "partId": "0",
          "filename": "",
          "mimeType": "multipart/alternative",
          "body": {
            "size": 0
          },
          "headers": [
            {
              "name": "Content-Type",
              "value": "multipart/alternative; boundary=\"----=_Part_547846_2066137498.1744339795809\""
            }
          ],
          "parts": [
            {
              "partId": "0.0",
              "filename": "",
              "mimeType": "text/html",
              "body": {
                "data": "PGhlYWQ-PHN0eWxlIHR5cGU9J3RleHQvY3NzJz4qIHttYXJnaW46IDM7Ym9yZGVyOiAxO3BhZGRpbmc6IDE7fSBAcGFnZSB7IHNpemU6IEEzIHBvcnRyYWl0OyBtYXJnaW46IDRtbSA0bW0gNG1tIDRtbTsgfTwvc3R5bGU-PC9oZWFkPiA8Ym9keSBzdHlsZT0nZm9udC1mYW1pbHk6IEFyaWFsO21hcmdpbjo0OyBwYWRkaW5nOiAyOyBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmOyc-IDx0YWJsZSBjZWxsc3BhY2luZz0nMCcgY2VsbHBhZGRpbmc9JzAnIHdpZHRoPScxMDAlJyBhbGlnbj0nbGVmdCcgYm9yZGVyPScwJz4gPHRyPiA8dGQgdmFsaWduPSd0b3AnIHN0eWxlPSd3aWR0aDogMTAwJTsgYm9yZGVyOiAwJz4gPHRhYmxlIGNlbGxzcGFjaW5nPScwJyBjZWxscGFkZGluZz0nMCcgd2lkdGg9JzEwMCUnIGFsaWduPSdsZWZ0Jz4gPHRyPiA8dGQ-Jm5ic3A7PC90ZD4gPHRkIHZhbGlnbj0ndG9wJyBhbGlnbj0nY2VudGVyJyB3aWR0aD0nMTAwJyBzdHlsZT0nYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjsnPjxpbWcgYWx0PSdTd2lnZ3knIHN0eWxlPSd3aWR0aDoyMDBweDsnIHNyYz0naHR0cHM6Ly9tZWRpYS1hc3NldHMuc3dpZ2d5LmNvbS93XzUwMC9wb3J0YWwvbS9icmFuZF9sb2dvcy9Td2lnZ3klMjBJbnN0YW1hcnQlMjBPcmFuZ2UucG5nJy8-PC90ZD4gPHRkPiZuYnNwOzwvdGQ-IDwvdHI-IDx0cj4gPHRkIHdpZHRoPSc1Jz4gJm5ic3A7Jm5ic3A7PC90ZD4gPHRkIHZhbGlnbj0ndG9wJz4gPHRhYmxlIGNlbGxzcGFjaW5nPScwJyBjZWxscGFkZGluZz0n",
                "size": 10687
              },
              "headers": [
                {
                  "name": "Content-Type",
                  "value": "text/html; charset=UTF-8"
                },
                {
                  "name": "Content-Transfer-Encoding",
                  "value": "quoted-printable"
                }
              ]
            }
          ]
        },
        {
          "partId": "1",
          "filename": "taco/203308138905999_merged.pdf",
          "mimeType": "application/octet-stream",
          "body": {
            "size": 40591,
            "attachmentId": "ANGjdJ_sfSeaVoR0tR0-yN2Q2FV3Su3atjYmm8HACQUwtoCxvg6mgwGoQ3MYehMpwNJhi7K1myo_ZzOZrCEy-iKaSP54Sc0vdvYRM0LWiizSsvXBX0Y14N5gGVKU7iQAHBA-VU1I5vvRHz_cl2CyCdFE9uitz4j5vnQ_YJIqAvdtq4yyICXaV77dIY5cZFGm0MOdBz-k5neLsKeKe6wx9v8b5hxPSNFnienPbc-rntD2PZ88KPF2JpcIKKEuoqBx4TIhkCYnUFy_efmJ8Uu_KnotbJEw_aJaL-DJZAVLlIVwXi4z2GpDBfBdZOtMWzowXVm9FhxL0XTLKLvgjGjVq_XoD5uUeI1-iQqGgtOnOUxFBKJ_Q9BGa4wIsH7pYAAcW8AmCgZVT-QhX-woZlVz"
          },
          "headers": [
            {
              "name": "Content-Type",
              "value": "application/octet-stream; name=\"taco/203308138905999_merged.pdf\""
            },
            {
              "name": "Content-Transfer-Encoding",
              "value": "base64"
            },
            {
              "name": "Content-Disposition",
              "value": "attachment; filename=\"taco/203308138905999_merged.pdf\""
            }
          ]
        }
      ]
    }
  }
}