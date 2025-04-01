import { TriggerClient } from "@trigger.dev/sdk";

export const client = new TriggerClient({
  id: "knitly",
  apiKey: process.env.TRIGGER_API_KEY!,
  apiUrl: process.env.TRIGGER_API_URL,
});

// Export the client for use in tasks
export default client; 