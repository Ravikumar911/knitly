import { tool } from 'ai';
import { z } from 'zod';

export const formatResponseTool = tool({
  description: `Format SQL query results into a natural, conversational response for the user.
  
  Guidelines:
  - Present data in a clear, easy-to-read format
  - Include relevant insights and observations
  - Use bullet points or numbered lists for multiple items
  - Format currency values properly (e.g., ₹1,234.56)
  - Highlight interesting patterns or trends
  - Keep the tone friendly and helpful
  - If data is empty, provide a helpful explanation`,
  
  inputSchema: z.object({
    response: z.string().describe('Natural language response to the user with formatted data'),
    summary: z.string().optional().describe('Brief summary if data is complex or contains insights'),
  }),
  
  execute: async ({ response, summary }) => {
    return { 
      response, 
      summary: summary || null,
      formatted: true,
    };
  },
});

