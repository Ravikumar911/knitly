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
    
    logger.log("Fetching Gmail messages", {
      query: query.trim() || undefined
    });

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
  } catch (error: any) {
    logger.error('Error fetching Gmail messages:', { 
      error: error instanceof Error ? error.message : String(error),
      status: error?.status || error?.code,
      details: error?.response?.data || error?.details
    });
    
    // Check if this is an OAuth permission error that should be propagated
    if (error?.status === 403 || error?.code === 403) {
      // This is likely an insufficient permissions error
      const oauthError = new Error(`Gmail API permission error: ${error.message || 'Insufficient permissions to access Gmail'}`);
      (oauthError as any).isOAuthError = true;
      (oauthError as any).status = 403;
      (oauthError as any).type = 'INSUFFICIENT_PERMISSIONS';
      throw oauthError;
    }
    
    if (error?.status === 401 || error?.code === 401) {
      // This is likely an authentication error
      const oauthError = new Error(`Gmail API authentication error: ${error.message || 'Invalid or expired token'}`);
      (oauthError as any).isOAuthError = true;
      (oauthError as any).status = 401;
      (oauthError as any).type = 'REVOKED_ACCESS';
      throw oauthError;
    }
    
    // For other errors, return null (existing behavior)
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
  } catch (error: any) {
    logger.error('Error fetching Gmail message details:', { 
      messageId,
      error: error instanceof Error ? error.message : String(error),
      status: error?.status || error?.code,
      details: error?.response?.data || error?.details
    });
    
    // Check if this is an OAuth permission error that should be propagated
    if (error?.status === 403 || error?.code === 403) {
      // This is likely an insufficient permissions error
      const oauthError = new Error(`Gmail API permission error: ${error.message || 'Insufficient permissions to access Gmail'}`);
      (oauthError as any).isOAuthError = true;
      (oauthError as any).status = 403;
      (oauthError as any).type = 'INSUFFICIENT_PERMISSIONS';
      throw oauthError;
    }
    
    if (error?.status === 401 || error?.code === 401) {
      // This is likely an authentication error
      const oauthError = new Error(`Gmail API authentication error: ${error.message || 'Invalid or expired token'}`);
      (oauthError as any).isOAuthError = true;
      (oauthError as any).status = 401;
      (oauthError as any).type = 'REVOKED_ACCESS';
      throw oauthError;
    }
    
    // For other errors, return null (existing behavior)
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



