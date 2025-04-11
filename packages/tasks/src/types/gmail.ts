/**
 * Gmail API type definitions
 */

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailBodyPart {
  mimeType: string;
  filename?: string;
  body?: {
    data?: string;
    size?: number;
    attachmentId?: string;
  };
  headers?: GmailHeader[];
  parts?: GmailBodyPart[];
  partId?: string;
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
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers?: GmailHeader[];
    body?: {
      data?: string;
      size?: number;
      attachmentId?: string;
    };
    parts?: GmailBodyPart[];
  };
  sizeEstimate?: number;
  raw?: string;
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

export interface GmailMessageList {
  messages?: Array<{
    id: string;
    threadId?: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}
