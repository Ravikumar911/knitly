import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Re-export everything from schema and types
export * from './schema';
export * from './types';
export * from 'drizzle-orm';

// For query purposes (not for migrations)
const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });