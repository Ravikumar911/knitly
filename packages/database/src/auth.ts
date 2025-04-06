import { eq } from "drizzle-orm";
import { db } from "./";
import { userGoogleTokens } from "./schema/tokens";

/**
 * Refreshes the Google provider token using the user's session
 * @param userId The user ID to refresh the token for
 * @returns The refreshed provider token or null if unable to refresh
 */
export const refreshProviderToken = async (userId: string): Promise<string | null> => {
  try {
    const userGoogleToken = await db.query.userGoogleTokens.findFirst({
      where: eq(userGoogleTokens.userId, userId),   
    })

    return userGoogleToken?.providerToken || null;
  } catch (error) {
    console.error('Error refreshing provider token:', error);
    return null;
  }
}; 