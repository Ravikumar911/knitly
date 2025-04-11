import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  // Exclude auth schema tables from migrations as they're managed by Supabase
  tablesFilter: ["!auth.*"],
} satisfies Config; 