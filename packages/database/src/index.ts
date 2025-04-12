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

// Export AI analysis functions
export * from './queries/aiAnalysis';

// For query purposes (not for migrations)
const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { 
    schema: {
        ...schema,
    }
 });