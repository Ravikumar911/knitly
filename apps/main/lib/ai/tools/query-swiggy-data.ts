import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@workspace/database';
import { sql } from 'drizzle-orm';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const createQuerySwiggyDataTool = (userId: string) => tool({
  description: `Query Swiggy transaction data to answer user questions about spending patterns.
  
This tool automatically generates and executes SQL queries based on natural language questions.

Available data includes:
- Transaction amounts, dates, and statuses
- Restaurant names and delivery addresses
- Order items (for Instamart grocery orders)
- Service types: FOOD_DELIVERY, INSTAMART, DINEOUT
- Delivery fees, discounts, and membership savings
- Payment methods and categories

The tool will return structured data that you should analyze to answer the user's question naturally.`,
  
  inputSchema: z.object({
    question: z.string().describe('The user\'s question about their Swiggy spending (e.g., "How much did I spend on pizza?")'),
  }),
  
  execute: async ({ question }) => {
    console.log('[query-swiggy-data] 🔧 Tool called with question:', question);
    
    try {
      // Step 1: Generate SQL query using a fast model
      console.log('[query-swiggy-data] Generating SQL query...');
      const sqlGeneration = await generateText({
        model: openai('gpt-5-mini'),
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `Generate a PostgreSQL query for the transactions_v2 table.

Schema:
- user_id (uuid): ALWAYS filter by user_id = '${userId}'
- merchant_id (varchar): ALWAYS filter by merchant_id = 'swiggy'
- amount (decimal): Transaction amount
- status (varchar): COMPLETED, PENDING, FAILED, CANCELLED
- transaction_date (timestamp): Transaction date
- merchant_data (jsonb): Contains:
  * swiggyMetadata.service: 'FOOD_DELIVERY', 'INSTAMART', 'DINEOUT'
  * transaction.restaurantName: Restaurant name
  * transaction.orderItems: Array of order items (name, quantity, price)
  * transaction.deliveryFee: Delivery fee
  * transaction.discount: Discount amount

JSONB Query Examples:
- Service filter: merchant_data->'swiggyMetadata'->>'service' = 'FOOD_DELIVERY'
- Restaurant: merchant_data->'transaction'->>'restaurantName'
- Item search: EXISTS (SELECT 1 FROM jsonb_array_elements(merchant_data->'transaction'->'orderItems') AS item WHERE item->>'name' ILIKE '%pizza%')

Rules:
1. ALWAYS include: WHERE user_id = '${userId}' AND merchant_id = 'swiggy'
2. Cast amounts: amount::numeric
3. Default to status = 'COMPLETED' for spending queries
4. Use ILIKE for text search
5. Order logically (e.g., transaction_date DESC)

Return ONLY the SQL query, no explanations.`
          },
          {
            role: 'user',
            content: question
          }
        ]
      });

      const generatedSQL = sqlGeneration.text.trim().replace(/^```sql\n?|```$/g, '');
      console.log('[query-swiggy-data] Generated SQL:', generatedSQL);

      // Step 2: Security checks
      console.log('[query-swiggy-data] Running security checks...');
      
      const uppercaseQuery = generatedSQL.toUpperCase();
      const writeOperations = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE'];
      if (writeOperations.some(op => uppercaseQuery.includes(op))) {
        console.log('[query-swiggy-data] ❌ Security check failed: write operation detected');
        return {
          success: false,
          data: null,
          error: 'Only SELECT queries are allowed',
        };
      }

      if (!generatedSQL.toLowerCase().includes('user_id')) {
        console.log('[query-swiggy-data] ❌ Security check failed: missing user_id filter');
        return {
          success: false,
          data: null,
          error: 'Query must include user_id filter',
        };
      }

      if (!generatedSQL.toLowerCase().includes("merchant_id = 'swiggy'")) {
        console.log('[query-swiggy-data] ❌ Security check failed: missing merchant_id filter');
        return {
          success: false,
          data: null,
          error: 'Query must filter by merchant_id',
        };
      }

      console.log('[query-swiggy-data] ✅ Security checks passed');

      // Step 3: Execute query
      console.log('[query-swiggy-data] 🚀 Executing query...');
      const result = await db.execute(sql.raw(generatedSQL));
      const rows = Array.isArray(result) ? result : Array.from(result);
      
      console.log('[query-swiggy-data] ✅ Query executed successfully');
      console.log('[query-swiggy-data] Rows returned:', rows.length);
      console.log('[query-swiggy-data] Sample data:', rows.length > 0 ? JSON.stringify(rows[0]) : 'No data');

      return {
        success: true,
        data: rows,
        rowCount: rows.length,
        sql: generatedSQL,
        message: rows.length > 0 
          ? `Found ${rows.length} result${rows.length === 1 ? '' : 's'}`
          : 'No matching data found. The user may not have any transactions matching these criteria.',
      };

    } catch (error: unknown) {
      console.error('[query-swiggy-data] ❌ Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  },
});


