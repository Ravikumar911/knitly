import { getUserGoogleToken, updateUserGoogleToken } from "@workspace/database";

// OAuth Error Types for better error classification
export interface OAuthError {
  code: string;
  type: 'INSUFFICIENT_PERMISSIONS' | 'REVOKED_ACCESS' | 'EXPIRED_TOKEN' | 'INVALID_GRANT' | 'OAUTH_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  requiresReauth: boolean;
  userFriendlyMessage: string;
}

/**
 * Classifies OAuth errors based on the response from Google
 */
const classifyOAuthError = (responseText: string, statusCode: number): OAuthError => {
  const lowerResponseText = responseText.toLowerCase();
  
  // Parse JSON response if possible
  let parsedResponse: any = {};
  try {
    parsedResponse = JSON.parse(responseText);
  } catch {
    // If not JSON, continue with string analysis
  }

  const errorCode = parsedResponse.error || '';
  const errorDescription = parsedResponse.error_description || responseText;

  // Check for specific OAuth error conditions
  if (errorCode === 'invalid_grant' || lowerResponseText.includes('invalid_grant')) {
    return {
      code: 'INVALID_GRANT',
      type: 'REVOKED_ACCESS',
      message: `OAuth grant invalid or revoked: ${errorDescription}`,
      requiresReauth: true,
      userFriendlyMessage: 'Your Google account access has been revoked. Please sign in again to grant email permissions.'
    };
  }

  if (errorCode === 'insufficient_scope' || lowerResponseText.includes('insufficient') || 
      lowerResponseText.includes('scope') || statusCode === 403) {
    return {
      code: 'INSUFFICIENT_SCOPE',
      type: 'INSUFFICIENT_PERMISSIONS',
      message: `Insufficient OAuth permissions: ${errorDescription}`,
      requiresReauth: true,
      userFriendlyMessage: 'You haven\'t granted permission to access your Gmail. Please sign in again and allow email access.'
    };
  }

  if (lowerResponseText.includes('token_expired') || lowerResponseText.includes('expired')) {
    return {
      code: 'TOKEN_EXPIRED',
      type: 'EXPIRED_TOKEN',
      message: `OAuth token expired: ${errorDescription}`,
      requiresReauth: false,
      userFriendlyMessage: 'Your Google session has expired. Please try again.'
    };
  }

  if (statusCode === 401) {
    return {
      code: 'UNAUTHORIZED',
      type: 'REVOKED_ACCESS',
      message: `OAuth unauthorized (401): ${errorDescription}`,
      requiresReauth: true,
      userFriendlyMessage: 'Your Google account access is no longer valid. Please sign in again.'
    };
  }

  // Generic OAuth error
  return {
    code: 'OAUTH_ERROR',
    type: 'OAUTH_ERROR',
    message: `OAuth error (${statusCode}): ${errorDescription}`,
    requiresReauth: true,
    userFriendlyMessage: 'There was a problem with your Google account connection. Please sign in again.'
  };
};

/**
 * Enhanced result type for refreshGoogleToken
 */
export interface TokenRefreshResult {
  success: boolean;
  token?: string;
  error?: OAuthError;
}

/**
 * Refreshes a Google OAuth token with enhanced error handling
 * @param userId The user ID to refresh the token for
 * @returns Enhanced result with detailed error information
 */
export const refreshGoogleToken = async (userId: string): Promise<TokenRefreshResult> => {
  try {
    // Get current token info from database
    const userGoogleToken = await getUserGoogleToken(userId);
    
    if (!userGoogleToken) {
      console.error('No Google token found for user:', userId);
      return {
        success: false,
        error: {
          code: 'NO_TOKEN_FOUND',
          type: 'INSUFFICIENT_PERMISSIONS',
          message: 'No Google token found for user',
          requiresReauth: true,
          userFriendlyMessage: 'Please sign in with Google to grant email access.'
        }
      };
    }
    
    if (!userGoogleToken.providerRefreshToken) {
      console.error('No refresh token found for user:', userId);
      return {
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          type: 'INSUFFICIENT_PERMISSIONS',
          message: 'No refresh token found for user',
          requiresReauth: true,
          userFriendlyMessage: 'Please sign in again and make sure to grant offline access to your Gmail.'
        }
      };
    }
    
    // Check if token is still valid
    const now = new Date();
    if (userGoogleToken.tokenExpiresAt && 
        userGoogleToken.tokenExpiresAt > now && 
        userGoogleToken.providerToken) {
      // Token is still valid, return it
      return {
        success: true,
        token: userGoogleToken.providerToken
      };
    }
    
    // Token expired or doesn't exist, refresh using the refresh token
    return await refreshTokenWithGoogle(userGoogleToken.providerRefreshToken, userId);
  } catch (error) {
    console.error('Error in refreshGoogleToken:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        type: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : String(error),
        requiresReauth: true,
        userFriendlyMessage: 'An unexpected error occurred. Please try signing in again.'
      }
    };
  }
};

/**
 * Refreshes a Google OAuth token using the refresh token with enhanced error handling
 */
export const refreshTokenWithGoogle = async (
  refreshToken: string, 
  userId: string
): Promise<TokenRefreshResult> => {
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
      const responseText = await refreshTokenResponse.text();
      console.error('Failed to refresh token:', responseText);
      
      const oauthError = classifyOAuthError(responseText, refreshTokenResponse.status);
      return {
        success: false,
        error: oauthError
      };
    }

    const tokenData = await refreshTokenResponse.json();
    
    // Calculate expiration time (usually 3600 seconds/1 hour from now)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));
    
    // Update the token in our database
    const updateSuccess = await updateUserGoogleToken(userId, tokenData.access_token, expiresAt);
    
    if (!updateSuccess) {
      return {
        success: false,
        error: {
          code: 'DATABASE_UPDATE_FAILED',
          type: 'UNKNOWN_ERROR',
          message: 'Failed to update token in database',
          requiresReauth: false,
          userFriendlyMessage: 'Token refreshed but failed to save. Please try again.'
        }
      };
    }

    return {
      success: true,
      token: tokenData.access_token
    };
  } catch (error) {
    console.error('Error refreshing token with Google:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        type: 'OAUTH_ERROR',
        message: error instanceof Error ? error.message : String(error),
        requiresReauth: false,
        userFriendlyMessage: 'Network error occurred while refreshing your Google connection. Please check your internet and try again.'
      }
    };
  }
};

// Legacy function for backward compatibility - returns null on any error
export const refreshGoogleTokenLegacy = async (userId: string): Promise<string | null> => {
  const result = await refreshGoogleToken(userId);
  return result.success ? result.token! : null;
}; 


