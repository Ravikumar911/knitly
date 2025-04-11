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
  detectedProvider?: string;
  emailType?: string;
  parseSuccess?: boolean;
  parseErrors?: string;
}

export interface GmailAttachment {
  filename: string;
  contentId: string;
  contentType: string;
  data: string;
}
