import { logger } from "@trigger.dev/sdk/v3";
import { ProcessedEmailData } from "../types/gmail";
import { storeEmailData as dbStoreEmail, storeTransactionData as dbStoreTransaction } from "@workspace/database";
import { createSupabaseClient } from "./supabase";
import { downloadAttachment } from "./gmailApi";

/**
 * Stores processed email data using the database functions
 */
export const storeEmailData = async (emailData: ProcessedEmailData) => {
  try {
    logger.log("Storing email data", { 
      messageId: emailData.messageId,
      subject: emailData.subject
    });

    const stored = await dbStoreEmail({
      messageId: emailData.messageId,
      userId: emailData.userId,
      subject: emailData.subject,
      sender: emailData.from,
      receivedDate: new Date(emailData.date),
      detectedProvider: emailData.detectedProvider,
      emailType: emailData.emailType,
      parseSuccess: emailData.parseSuccess || false,
      parseErrors: emailData.parseErrors,
      rawContent: emailData.body,
    });

    if (!stored || stored.length === 0) {
      throw new Error("Failed to store email data");
    }

    logger.log("Email data stored successfully", { 
      messageId: emailData.messageId,
      id: stored[0]?.id
    });
    
    return stored[0];
  } catch (error) {
    logger.error("Error storing email data", { 
      messageId: emailData.messageId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

/**
 * Stores transaction data using the database functions
 */
export const storeTransactionData = async (data: {
  userId: string;
  parsedEmailId: string;
  amount: number;
  currency: string;
  type: string;
  transactionDate: Date;
  description?: string;
  upiReferenceId?: string;
  upiTransactionId?: string;
  counterpartyUpiHandle?: string;
  isRecurring: boolean;
}) => {
  try {
    logger.log("Storing transaction data", {
      userId: data.userId,
      parsedEmailId: data.parsedEmailId,
    });

    const stored = await dbStoreTransaction(data);
    logger.log("Transaction stored", {
      stored
    });

    if (!stored || stored.length === 0) {
      throw new Error("Failed to store transaction data");
    }

    logger.log("Transaction stored successfully", {
      id: stored[0]?.id,
    });

    return stored[0];
  } catch (error) {
    logger.error("Error storing transaction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Downloads Gmail attachments and uploads them to Supabase storage
 */
export const processAttachments = async (
  userId: string,
  messageId: string,
  providerToken: string,
  attachments: Array<{
    filename: string;
    attachmentId: string;
    mimeType: string;
  }>
): Promise<string[] | null> => {
  try {
    if (!attachments.length) {
      return [];
    }

    const supabase = createSupabaseClient();
    const storagePaths: string[] = [];

    for (const attachment of attachments) {
      // Download attachment from Gmail
      const attachmentData = await downloadAttachment(providerToken, messageId, attachment.attachmentId);
      
      if (!attachmentData?.data) {
        logger.error("Failed to download attachment", {
          messageId,
          attachmentId: attachment.attachmentId,
          filename: attachment.filename
        });
        continue;
      }

      // Generate a unique storage path for each attachment
      const timestamp = new Date().getTime();
      const safeName = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `attachments/${userId}/${messageId}/${timestamp}_${safeName}`;

      logger.log("Uploading attachment to storage", {
        messageId,
        filename: attachment.filename,
        storagePath,
        attachmentData,
        attachment
      });

      const buffer = Buffer.from(attachmentData.data, "base64");
      logger.log('Base64 length:', {length: attachmentData.data.length});
      logger.log('Expected size (bytes):', {size: attachmentData.size});

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('email-attachments')
        .upload(storagePath, buffer, {
          contentType: attachment.mimeType,
          upsert: true
        });

      if (uploadError) {
        logger.error("Failed to upload attachment to storage", {
          messageId,
          filename: attachment.filename,
          error: uploadError
        });
        continue;
      }

      logger.log("Attachment uploaded successfully", {
        messageId,
        filename: attachment.filename,
        storagePath
      });

      storagePaths.push(storagePath);
    }

    return storagePaths;
  } catch (error) {
    logger.error("Error processing attachments", {
      messageId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}; 