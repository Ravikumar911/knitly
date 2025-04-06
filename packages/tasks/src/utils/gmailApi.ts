import { logger } from "@trigger.dev/sdk/v3";
import { GmailMessage } from "../types/gmail.js";

// Configuration
export const EMAIL_PROCESSING_LIMIT = 10; // Maximum number of emails to process per run

/**
 * Fetches a list of Gmail messages
 * @param providerToken OAuth access token
 * @param limit Maximum number of messages to fetch
 * @returns List of message IDs or null if error
 */
export const fetchGmailMessages = async (providerToken: string, limit = EMAIL_PROCESSING_LIMIT) => {
  try {
    // Initial API call to get message IDs
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}`, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      logger.error('Gmail API error:', { 
        status: response.status,
        statusText: response.statusText 
      });
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching Gmail messages:', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
};

/**
 * Fetches a single Gmail message by ID
 * @param providerToken OAuth access token
 * @param messageId The message ID to fetch
 * @returns The message details or null if error
 */
export const fetchGmailMessage = async (providerToken: string, messageId: string): Promise<GmailMessage | null> => {
  try {
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (!response.ok) {
      logger.error(`Error fetching Gmail message ${messageId}:`, { 
        status: response.status,
        statusText: response.statusText 
      });
      return null;
    }

    const messageData = await response.json();
    return messageData as GmailMessage;
  } catch (error) {
    logger.error(`Error fetching Gmail message ${messageId}:`, { 
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
  let body = '';
  
  if (messageData.payload?.parts) {
    // Email with multiple parts - find the text/plain part
    const textPart = messageData.payload.parts.find(
      part => part.mimeType === 'text/plain'
    );
    
    if (textPart?.body?.data) {
      // Decode the base64 content
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  } else if (messageData.payload?.body?.data) {
    // Email with single part
    body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
  }
  
  return body;
}; 