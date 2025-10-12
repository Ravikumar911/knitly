import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@workspace/database';
import { sql } from 'drizzle-orm';

export const createExecuteSQLTool = (userId: string) => tool({
  description: 'Execute a validated SQL query and return results. The query will be automatically filtered by the current user ID for security.',
  
  inputSchema: z.object({
    sql: z.string().describe('SQL query to execute (user_id will be automatically injected)'),
  }),
  
  execute: async ({ sql: sqlQuery }) => {
    console.log('[execute-sql] Tool called with query:', sqlQuery);
    console.log('[execute-sql] User ID:', userId);
    
    try {
      // Security: Replace $USER_ID placeholder with actual userId
      const safeQuery = sqlQuery.replace(/\$USER_ID/g, `'${userId}'`);
      console.log('[execute-sql] Safe query after user ID replacement:', safeQuery);
      
      // Security check 1: Enforce read-only operations
      console.log('[execute-sql] Running security check 1: read-only operations');
      const uppercaseQuery = safeQuery.toUpperCase();
      const writeOperations = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE'];
      if (writeOperations.some(op => uppercaseQuery.includes(op))) {
        console.log('[execute-sql] ❌ Security check 1 failed: write operation detected');
        return {
          success: false,
          data: null,
          error: 'Only SELECT queries are allowed for security',
        };
      }
      console.log('[execute-sql] ✅ Security check 1 passed');
      
      // Security check 2: Ensure query contains user_id filter
      console.log('[execute-sql] Running security check 2: user_id filter');
      if (!safeQuery.toLowerCase().includes('user_id')) {
        console.log('[execute-sql] ❌ Security check 2 failed: missing user_id filter');
        return {
          success: false,
          data: null,
          error: 'Query must include user_id filter for security',
        };
      }
      console.log('[execute-sql] ✅ Security check 2 passed');
      
      // Security check 3: Enforce Swiggy merchant filter
      console.log('[execute-sql] Running security check 3: merchant_id filter');
      if (!safeQuery.toLowerCase().includes("merchant_id = 'swiggy'")) {
        console.log('[execute-sql] ❌ Security check 3 failed: missing merchant_id filter');
        return {
          success: false,
          data: null,
          error: "Query must filter by merchant_id = 'swiggy' to scope data access",
        };
      }
      console.log('[execute-sql] ✅ Security check 3 passed');
      
      // Execute the query
      console.log('[execute-sql] 🚀 Executing query...');
      const result = await db.execute(sql.raw(safeQuery));
      
      // drizzle-orm execute returns RowList which is array-like
      const rows = Array.isArray(result) ? result : Array.from(result);
      
      console.log('[execute-sql] ✅ Query executed successfully');
      console.log('[execute-sql] Rows returned:', rows.length);
      console.log('[execute-sql] Sample data (first row):', rows.length > 0 ? JSON.stringify(rows[0]) : 'No data');
      
      return {
        success: true,
        data: rows,
        rowCount: rows.length,
        message: `Query executed successfully. Retrieved ${rows.length} rows.`,
      };
    } catch (error: unknown) {
      console.error('[execute-sql] ❌ Database error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      console.error('[execute-sql] Error message:', errorMessage);
      
      return {
        success: false,
        data: null,
        error: errorMessage,
        hint: 'Check SQL syntax and JSONB operations. Ensure proper casting (e.g., amount::numeric) and correct field names. For JSONB: use -> for objects, ->> for text values.',
      };
    }
  },
});

