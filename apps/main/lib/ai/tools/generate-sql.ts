import { tool } from 'ai';
import { z } from 'zod';

export const generateSQLTool = tool({
  description: `Generate SQL queries for the transactions_v2 table to answer user questions about DoorDash and Uber Eats spending for users in the USA and Canada.
  
  Schema Information:
  - Table: transactions_v2
  - user_id (uuid): User ID filter - ALWAYS REQUIRED
  - merchant_id (varchar): provider id, use only 'doordash' or 'ubereats'
  - merchant_name (varchar): Display name
  - amount (decimal): Transaction amount in decimal format
  - currency (varchar): Currency code (typically USD or CAD)
  - type (varchar): DEBIT or CREDIT
  - status (varchar): COMPLETED, PENDING, FAILED, CANCELLED
  - transaction_date (timestamp): Transaction date and time
  - description (text): Transaction description
  - category (varchar): Transaction category
  - payment_method (varchar): Payment method used
  - merchant_data (jsonb): JSONB field containing:
    * transaction.merchantName: Restaurant/store name
    * transaction.orderId: Provider order identifier
    * transaction.deliveryFee: Delivery fee amount when present
    * transaction.discount: Discount amount when present
    * transaction.location: delivery location metadata when available
  
  JSONB Query Examples:
  - Filter by provider: merchant_id IN ('doordash', 'ubereats')
  - Get restaurant name: merchant_data->'transaction'->>'merchantName'
  - Get delivery fee: (merchant_data->'transaction'->>'deliveryFee')::numeric
  
  Important Rules:
  1. ALWAYS include WHERE user_id = $USER_ID in your query
  2. ALWAYS include merchant_id IN ('doordash', 'ubereats') filter
  3. Use proper JSONB operators (->, ->>, @>) for nested fields
  4. Cast amount to numeric for calculations: amount::numeric
  5. Use ILIKE for case-insensitive text search
  6. For aggregations, use SUM(), COUNT(), AVG() as appropriate
  7. Order results logically (e.g., by transaction_date DESC for recent orders)`,
  
  inputSchema: z.object({
    sql: z.string().describe('Valid PostgreSQL query with proper JSONB operations'),
    explanation: z.string().describe('Brief explanation of what this query does'),
  }),
  
  execute: async ({ sql, explanation }) => {
    console.log('[generate-sql] 🔧 Tool called');
    console.log('[generate-sql] Generated SQL:', sql);
    console.log('[generate-sql] Explanation:', explanation);
    
    return { 
      sql, 
      explanation,
      message: 'SQL query generated successfully. Proceed to execute it.'
    };
  },
});

