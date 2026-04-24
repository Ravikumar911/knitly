import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { drizzle } from "drizzle-orm/better-sqlite3";
import "dotenv/config";
import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import { localMigrationSql } from "./migrations/local";
import * as schema from "./schema";

export const dbPath =
  process.env.SQLITE_DB_PATH ||
  join(
    process.env.SLASHCASH_HOME || join(homedir(), ".slashcash"),
    "db.sqlite",
  );

mkdirSync(dirname(dbPath), { recursive: true });

export const sqlite: BetterSqlite3.Database = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
sqlite.exec(localMigrationSql);
ensureLegacyColumns(sqlite);

export const db = drizzle(sqlite, {
  schema: {
    ...schema,
  },
});

function ensureLegacyColumns(database: BetterSqlite3.Database) {
  if (!hasColumn(database, "profiles", "email")) {
    database.exec("ALTER TABLE profiles ADD COLUMN email text");
  }
}

function hasColumn(
  database: BetterSqlite3.Database,
  tableName: string,
  columnName: string,
) {
  const columns = database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  return columns.some((column) => column.name === columnName);
}
