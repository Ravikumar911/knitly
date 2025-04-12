import { gmail_v1 } from 'googleapis';

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

// Extend the Gmail API Message type
export type GmailMessage = gmail_v1.Schema$Message;


export interface GmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  data?: string;
}

// Extend the Gmail API ListMessagesResponse type
export type GmailMessageList = gmail_v1.Schema$ListMessagesResponse;
