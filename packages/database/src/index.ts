import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Re-export everything from schema and types
export * from './types';
export * from 'drizzle-orm';

// Export auth and Gmail modules
export * from './auth';
export * from './gmail';

// For query purposes (not for migrations)
const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { 
    schema: {
        ...schema,
    }
 });