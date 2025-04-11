import { logger } from "@trigger.dev/sdk/v3";
import { ProcessedEmailData } from "../types/gmail";
import { storeEmailData as dbStoreEmail, storeTransactionData as dbStoreTransaction } from "@workspace/database";

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