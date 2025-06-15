import { pgSchema, pgTable, text, timestamp, varchar, uuid } from "drizzle-orm/pg-core";

const auth = pgSchema('auth');
const authUsers = auth.table('users', {
	id: uuid().primaryKey().notNull(),
});

// Core user profiles table in public schema
export const profiles = pgTable("profiles", {
  id: uuid("id")
  .primaryKey()
  .references(() => authUsers.id, { onDelete: "cascade" }),
  first_name: varchar("first_name", { length: 255 }),
  last_name: varchar("last_name", { length: 255 }),
  updated_at: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
}); 