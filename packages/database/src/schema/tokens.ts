import { pgTable, text, timestamp, serial, uuid, foreignKey, pgSchema } from "drizzle-orm/pg-core";

/**
 * Placeholder for Supabase auth.users table to establish relations
 * (Actual auth tables are managed by Supabase Auth)
 */

const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});


/**
 * Google OAuth tokens for users
 * Stores refresh tokens and access tokens needed for the Google Mail API
 * Used by TriggerDev cron jobs to fetch emails
 */
export const userGoogleTokens = pgTable("user_google_tokens", {
  userId: uuid("user_id").primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  providerRefreshToken: text("provider_refresh_token").notNull(),
  providerToken: text("provider_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Access logs for token usage
 * Records when tokens are read or refreshed for audit purposes
 */
export const tokenAccessLogs = pgTable("token_access_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .references(() => authUsers.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g., "read", "refresh"
  performedAt: timestamp("performed_at", { withTimezone: true }).defaultNow().notNull(),
}); 