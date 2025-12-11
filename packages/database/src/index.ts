import { drizzle } from 'drizzle-orm/postgres-js';
import 'dotenv/config';
import postgres from 'postgres';
import * as schema from './schema';

// Re-export everything from schema and types
export * from './types';
export * from 'drizzle-orm';
export * from './schema'


// Queryable operations for the database
export * from './queries/auth'
export * from './queries/operations/emails';
export * from './queries/operations/emailSync';
export * from './schema/emailSyncStatus';



// Export transaction deduplication
export * from './queries/operations/transactionFellegiSunter';



// For query purposes (not for migrations)
const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { 
    schema: {
        ...schema,
    }
 });

export * from './schema/users';
export * from './schema/parsedEmails';
export * from './schema/emailSyncStatus';
export * from './schema/relations';

// New v2 schema modules
export * from './schema/transactionsV2';

// Export enhanced transaction functions
export * from "./queries/transactionsEnhanced"

// Export new transaction query functions with email data
export * from "./queries/transactions"

// Export Swiggy analytics functions
export * from "./queries/insights/swiggyAnalytics"

// Export feedback functions
export * from "./queries/feedback"

// Export chat functions
export * from "./queries/chat"

// Export unified error types and utilities
export * from './types/errors';
export * from './types/emailSync';
export * from './utils/emailSync';