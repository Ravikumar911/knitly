import { logger } from "@trigger.dev/sdk/v3";
import { storeEmailData as dbStoreEmail, storeTransactionData as dbStoreTransaction, ParsedEmail, Transaction } from "@workspace/database";
import { createSupabaseClient } from "./supabase";
import { downloadAttachment } from "./gmailApi";

/**
 * Stores processed email data using the database functions
 */
export const storeEmailData = async (emailData: ParsedEmail) => {
  try {
    logger.log("Storing email data", { 
      threadId: emailData.threadId,
      subject: emailData.subject
    });

    const stored = await dbStoreEmail(emailData);

    if (!stored || stored.length === 0) {
      throw new Error("Failed to store email data");
    }

    logger.log("Email data stored successfully", { 
      id: stored[0]?.id
    });
    
    return stored[0];
  } catch (error) {
    logger.error("Error storing email data", { 
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

/**
 * Stores transaction data using the database functions
 */
export const storeTransactionData = async (data: Transaction) => {
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
 * Downloads Gmail attachments, stores them in Supabase, and returns their data directly
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
): Promise<{
  storagePaths: string[];
  processedAttachments: Array<{
    filename: string;
    mimeType: string;
    content: string;
  }>;
} | null> => {
  try {
    if (!attachments.length) {
      return {
        storagePaths: [],
        processedAttachments: []
      };
    }

    const supabase = createSupabaseClient();
    const storagePaths: string[] = [];
    const processedAttachments = [];

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
      const safeName = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `attachments/${userId}/${messageId}/${safeName}`;

      logger.log("Uploading attachment to storage", {
        messageId,
        filename: attachment.filename,
        storagePath
      });

      const buffer = Buffer.from(attachmentData.data, "base64");

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
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

      logger.log("Attachment processed successfully", {
        messageId,
        filename: attachment.filename,
        storagePath
      });

      storagePaths.push(storagePath);
      processedAttachments.push({
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        content: attachmentData.data
      });
    }

    return {
      storagePaths,
      processedAttachments
    };
  } catch (error) {
    logger.error("Error processing attachments", {
      messageId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}; 