import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Disable prefetch as it is not supported for "Transaction" pool mode with Supabase
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });

// Export schema for type safety
export * from './schema'; 