import 'dotenv/config';
import type { Config } from 'drizzle-kit';
import { join } from 'node:path';
import { homedir } from 'node:os';

export default {
  schema: './src/schema/*.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_DB_PATH || join(homedir(), '.slashcash', 'db.sqlite'),
  },
  verbose: true,
} satisfies Config; 
