import { pgSchema, pgTable, text, timestamp, foreignKey, varchar, uuid } from "drizzle-orm/pg-core";

const auth = pgSchema('auth');
const authUsers = auth.table('users', {
	id: uuid().primaryKey().notNull(),
});

// Core user profiles table in public schema
export const profiles = pgTable("profiles", {
  id: uuid("id")
  .primaryKey()
  .references(() => authUsers.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
  username: text("username").notNull(),
  website: text("website"),
}); 