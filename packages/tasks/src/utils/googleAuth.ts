import { getUserGoogleToken, updateUserGoogleToken } from "@workspace/database";

/**
 * Refreshes a Google OAuth token
 * @param userId The user ID to refresh the token for
 * @returns The refreshed provider token or null if unable to refresh
 */
export const refreshGoogleToken = async (userId: string): Promise<string | null> => {
  try {
    // Get current token info from database
    const userGoogleToken = await getUserGoogleToken(userId);
    
    if (!userGoogleToken) {
      console.error('No Google token found for user:', userId);
      return null;
    }
    
    // Check if token is still valid
    const now = new Date();
    if (userGoogleToken.tokenExpiresAt && 
        userGoogleToken.tokenExpiresAt > now && 
        userGoogleToken.providerToken) {
      // Token is still valid, return it
      return userGoogleToken.providerToken;
    }
    
    // Token expired or doesn't exist, refresh using the refresh token
    return await refreshTokenWithGoogle(userGoogleToken.providerRefreshToken, userId);
  } catch (error) {
    console.error('Error in refreshGoogleToken:', error);
    return null;
  }
};

/**
 * Refreshes a Google OAuth token using the refresh token
 */
export const refreshTokenWithGoogle = async (
  refreshToken: string, 
  userId: string
): Promise<string | null> => {
  try {
    const refreshTokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshTokenResponse.ok) {
      console.error('Failed to refresh token:', await refreshTokenResponse.text());
      return null;
    }

    const tokenData = await refreshTokenResponse.json();
    
    // Calculate expiration time (usually 3600 seconds/1 hour from now)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));
    
    // Update the token in our database
    await updateUserGoogleToken(userId, tokenData.access_token, expiresAt);

    return tokenData.access_token;
  } catch (error) {
    console.error('Error refreshing token with Google:', error);
    return null;
  }
}; 


