export * from './gmail'; 

export interface GmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  data?: string; // Base64 encoded data
}

export interface GmailAttachmentData {
  data: string; // Base64 encoded attachment data
  size: number;
} 