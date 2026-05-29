import {
  storeEmailData as dbStoreEmail,
  storeTransactionV2 as dbStoreTransaction,
  ParsedEmail,
  Transaction,
} from "@workspace/database";

const logger = {
  log: console.log,
  error: console.error,
};

/**
 * Stores processed email data using the database functions
 */
export const storeEmailData = async (emailData: ParsedEmail) => {
  try {
    logger.log("Storing email data", {
      threadId: emailData.threadId,
      subject: emailData.subject,
    });

    const stored = await dbStoreEmail(emailData);

    if (!stored || stored.length === 0) {
      throw new Error("Failed to store email data");
    }

    logger.log("Email data stored successfully", {
      id: stored[0]?.id,
    });

    return stored[0];
  } catch (error) {
    logger.error("Error storing email data", {
      error: error instanceof Error ? error.message : String(error),
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
      stored,
    });

    if (!stored) {
      throw new Error("Failed to store transaction data");
    }

    logger.log("Transaction stored successfully", {
      id: stored.id,
    });

    return stored;
  } catch (error) {
    logger.error("Error storing transaction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export const processAttachments = async (
  userId: string,
  messageId: string,
  providerToken: string,
  attachments: Array<{
    filename: string;
    attachmentId: string;
    mimeType: string;
  }>,
): Promise<{
  storagePaths: string[];
  processedAttachments: Array<{
    filename: string;
    mimeType: string;
    content: string;
    storageUrl: string;
  }>;
} | null> => {
  void userId;
  void messageId;
  void providerToken;
  void attachments;
  return {
    storagePaths: [],
    processedAttachments: [],
  };
};
