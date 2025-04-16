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
export * from './queries/operations/emailExtractionPatterns';
export * from './schema/emailSyncStatus';
export * from './queries/transactions';

// Export transaction deduplication
export * from './queries/operations/transactionDedup';
export * from './queries/reconciliation';
export * from './schema/reconciliationResults';

// Export AI analysis functions
export * from './queries/aiAnalysis';

// For query purposes (not for migrations)
const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { 
    schema: {
        ...schema,
    }
 });

export * from './schema/transactions';
export * from './schema/users';
export * from './schema/parsedEmails';
export * from './schema/aiAnalysis';
export * from './schema/emailExtractionPatterns';
export * from './schema/emailSyncStatus';
export * from './schema/financialInstruments';
export * from './schema/merchants';
export * from './schema/transactionCategories';
export * from './schema/financialInstitutions';
export * from './schema/relations';

// Export queries
export * from './queries/transactions';