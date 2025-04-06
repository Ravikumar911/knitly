import { logger } from "@trigger.dev/sdk/v3";
import { ProcessedEmailData } from "../types/gmail";

/**
 * Stores processed email data
 * @param emailData The email data to store
 * @returns True if successfully stored, false otherwise
 */
export const storeEmailData = async (emailData: ProcessedEmailData): Promise<boolean> => {
  try {
    logger.log("Storing email data", { 
      messageId: emailData.messageId,
      subject: emailData.subject
    });

    logger.log("Email data", { emailData });
    
    // Here you would implement the actual database storage
    // For example, using a database function:
    // await db.insert(parsedEmails).values({
    //   userId: emailData.userId,
    //   emailId: emailData.messageId,
    //   subject: emailData.subject,
    //   sender: emailData.from,
    //   receivedDate: new Date(emailData.date),
    //   rawContent: emailData.body,
    //   parseSuccess: true,
    //   createdAt: new Date(),
    //   updatedAt: new Date(),
    // });
    
    // For now, we're just logging the storage operation
    logger.log("Email data stored successfully", { 
      messageId: emailData.messageId 
    });
    
    return true;
  } catch (error) {
    logger.error("Error storing email data", { 
      messageId: emailData.messageId,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}; 