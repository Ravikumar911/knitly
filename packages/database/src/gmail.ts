/**
 * Fetches emails using the Gmail API with the provided token
 * @param providerToken The OAuth provider token for accessing Gmail API
 * @returns The fetched Gmail messages or null if the request failed
 */
export const fetchGmailMessages = async (providerToken: string) => {
  try {
    // Initial API call to get message IDs
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gmail API error:', errorData);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    return null;
  }
};

/**
 * Fetches a specific Gmail message by ID
 * @param providerToken The OAuth provider token for accessing Gmail API
 * @param messageId The ID of the Gmail message to fetch
 * @returns The fetched Gmail message details or null if the request failed
 */
export const fetchGmailMessage = async (providerToken: string, messageId: string) => {
  try {
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error fetching Gmail message ${messageId}:`, errorData);
      return null;
    }

    const messageData = await response.json();
    return messageData;
  } catch (error) {
    console.error(`Error fetching Gmail message ${messageId}:`, error);
    return null;
  }
}; 