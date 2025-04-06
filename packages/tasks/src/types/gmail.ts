/**
 * Gmail API type definitions
 */

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailBodyPart {
  mimeType: string;
  body?: {
    data?: string;
  };
}

export interface GmailMessagePayload {
  headers: GmailHeader[];
  parts?: GmailBodyPart[];
  body?: {
    data?: string;
  };
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: GmailMessagePayload;
}

export interface ProcessedEmailData {
  messageId: string;
  userId: string;
  threadId?: string;
  subject: string;
  from: string;
  date: string;
  snippet?: string;
  body: string;
} 