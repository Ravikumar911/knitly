import { logger } from "@trigger.dev/sdk/v3";
import { GmailMessage, GmailMessageList } from "../types/gmail.js";
import { GmailAttachment } from "../types/index.js";

// Configuration
export const GMAIL_API_BASE_URL = 'https://www.googleapis.com/gmail/v1';

/**
 * Builds Gmail search query from email extraction patterns
 */
export async function buildGmailSearchQuery(patterns: any[]) {
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
    
    // Build the Gmail API URL with query parameters
    const url = new URL(`${GMAIL_API_BASE_URL}/users/me/messages`);
    
    // Use maxResults from options or default to 10
    const maxResults = options?.maxResults || 10;
    url.searchParams.append('maxResults', maxResults.toString());
    
    // Add pagination token if provided
    if (options?.pageToken) {
      url.searchParams.append('pageToken', options.pageToken);
    }
    
    if (query.trim()) {
      url.searchParams.append('q', query.trim());
    }

    logger.log('Fetching Gmail messages', { 
      limit: maxResults, 
      hasDateFilter: !!options?.after || !!options?.before,
      hasPaginationToken: !!options?.pageToken 
    });

    logger.log('Gmail search query', { query, url: url.toString() });

    // Make the API request
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: 'application/json',
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
      logger.warn('Gmail API rate limit hit, retrying after delay', { delay });
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchGmailMessages(providerToken, options);
    }

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      logger.error('Gmail API authentication error', { status: response.status });
      return null;
    }

    // Handle other errors
    if (!response.ok) {
      logger.error('Gmail API error', { 
        status: response.status,
        statusText: response.statusText 
      });
      return null;
    }

    const data = await response.json() as GmailMessageList;
    
    logger.log('Gmail messages fetched successfully', { 
      count: data.messages?.length || 0,
      hasNextPage: !!data.nextPageToken,
      totalEstimate: data.resultSizeEstimate
    });
    
    return data;
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
    // Build the Gmail API URL
    const url = new URL(`${GMAIL_API_BASE_URL}/users/me/messages/${messageId}`);
    url.searchParams.append('format', 'full'); // Get full message content
    
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: 'application/json',
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
      logger.warn('Gmail API rate limit hit, retrying after delay', { delay, messageId });
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchGmailMessage(providerToken, messageId);
    }

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      logger.error('Gmail API authentication error', { status: response.status, messageId });
      return null;
    }

    // Handle message not found
    if (response.status === 404) {
      logger.error('Gmail message not found', { messageId });
      return null;
    }

    // Handle other errors
    if (!response.ok) {
      logger.error('Gmail API error fetching message', { 
        messageId,
        status: response.status,
        statusText: response.statusText 
      });
      return null;
    }

    return await response.json();
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
      to: 'Unknown',
      date: new Date().toISOString(),
      receivedDate: new Date()
    };
  }

  const headers = messageData.payload.headers;
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
  const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown';
  const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || 'Unknown';
  const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
  
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
    to,
    date,
    receivedDate
  };
};

/**
 * Extracts attachments from a Gmail message
 */
export function extractAttachments(message: any): GmailAttachment[] {
  const attachments: GmailAttachment[] = [];
  
  function processMessagePart(part: any) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
        data: part.body.data // Base64 encoded data if available
      });
    }
    
    // Recursively process child parts
    if (part.parts) {
      part.parts.forEach(processMessagePart);
    }
  }
  
  if (message.payload) {
    processMessagePart(message.payload);
  }
  
  return attachments;
} 