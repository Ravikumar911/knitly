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
  id?: string;
  threadId?: string;
  payload?: GmailMessagePayload;
  snippet?: string;
}


export interface GmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  data?: string;
}

export interface GmailMessageList {
  messages?: Array<{ id?: string; threadId?: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}
