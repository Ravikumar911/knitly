import { eq } from "drizzle-orm";
import { db } from "../../index";
import { userGoogleTokens, tokenAccessLogs } from "../../schema/tokens";

/**
 * Gets a user's Google token from the database
 * @param userId The user ID to get the token for
 * @returns The user's Google token or null if not found
 */
export const getUserGoogleToken = async (userId: string) => {
  try {
    return await db.query.userGoogleTokens.findFirst({
      where: eq(userGoogleTokens.userId, userId),   
    });
  } catch (error) {
    console.error('Error fetching user Google token:', error);
    return null;
  }
};

/**
 * Updates a user's Google token in the database
 * @param userId The user ID to update the token for
 * @param providerToken The new provider token
 * @param tokenExpiresAt When the token expires
 * @returns True if update was successful, false otherwise
 */
export const updateUserGoogleToken = async (
  userId: string,
  providerToken: string,
  tokenExpiresAt: Date
): Promise<boolean> => {
  try {
    await db.update(userGoogleTokens)
      .set({
        providerToken,
        tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userGoogleTokens.userId, userId));
    
    await logTokenAccess(userId, 'refresh');
    return true;
  } catch (error) {
    console.error('Error updating user Google token:', error);
    return false;
  }
};

/**
 * Logs token access for audit purposes
 * @param userId The user ID accessing the token
 * @param action The action performed (e.g., 'read', 'refresh')
 */
export const logTokenAccess = async (
  userId: string,
  action: string
): Promise<void> => {
  try {
    await db.insert(tokenAccessLogs).values({
      userId,
      action,
      performedAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging token access:', error);
  }
}; 