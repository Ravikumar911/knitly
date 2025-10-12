import { tool } from 'ai';
import { z } from 'zod';

export const generateSQLTool = tool({
  description: `Generate SQL queries for the transactions_v2 table to answer user questions about Swiggy spending.
  
  Schema Information:
  - Table: transactions_v2
  - user_id (uuid): User ID filter - ALWAYS REQUIRED
  - merchant_id (varchar): 'swiggy' for Swiggy transactions  
  - merchant_name (varchar): Display name
  - amount (decimal): Transaction amount in decimal format
  - currency (varchar): Currency code (default: INR)
  - type (varchar): DEBIT or CREDIT
  - status (varchar): COMPLETED, PENDING, FAILED, CANCELLED
  - transaction_date (timestamp): Transaction date and time
  - description (text): Transaction description
  - category (varchar): Transaction category
  - payment_method (varchar): Payment method used
  - merchant_data (jsonb): JSONB field containing:
    * swiggyMetadata.service: 'FOOD_DELIVERY', 'INSTAMART', or 'DINEOUT'
    * transaction.restaurantName: Restaurant name for food orders
    * transaction.orderId: Order ID
    * transaction.orderItems: Array of items ordered (for Instamart)
    * transaction.deliveryFee: Delivery fee amount
    * transaction.discount: Discount amount
    * transaction.membershipDiscount: Membership discount amount
    * transaction.deliveryAddress: Delivery address object (area, pincode)
  
  JSONB Query Examples:
  - Filter by service: merchant_data->'swiggyMetadata'->>'service' = 'FOOD_DELIVERY'
  - Get restaurant name: merchant_data->'transaction'->>'restaurantName'
  - Filter by item: merchant_data->'transaction'->'orderItems' @> '[{"name": "Pizza"}]'
  - Get delivery fee: (merchant_data->'transaction'->>'deliveryFee')::numeric
  
  Important Rules:
  1. ALWAYS include WHERE user_id = $USER_ID in your query
  2. ALWAYS include merchant_id = 'swiggy' filter
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

