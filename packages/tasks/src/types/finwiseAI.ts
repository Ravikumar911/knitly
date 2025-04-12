import { z } from "zod"

// Email data interface
export interface EmailData {
  userId: string;
  threadId: string;
  subject: string;
  body: string;
  date: string;
  from: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    content: string; // Base64 encoded content
  }>;
} 