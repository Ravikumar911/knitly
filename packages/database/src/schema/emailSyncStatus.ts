import { pgTable, timestamp, uuid, varchar, text, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const emailSyncStatus = pgTable("email_sync_status", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncAttemptAt: timestamp("last_sync_attempt_at"),
  nextPageToken: varchar("next_page_token", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 50 }).default("complete"),
  errorDetails: text("error_details"),
  
  // OAuth/Permission error tracking
  oauthErrorType: varchar("oauth_error_type", { length: 50 }), // 'INSUFFICIENT_PERMISSIONS', 'REVOKED_ACCESS', etc.
  oauthErrorCode: varchar("oauth_error_code", { length: 100 }), // Specific error code from Google
  requiresReauth: boolean("requires_reauth").default(false), // Whether user needs to re-authenticate
  userFriendlyError: text("user_friendly_error"), // Message to show to users
  
  // New progress tracking fields
  totalEmails: integer("total_emails"),
  processedEmails: integer("processed_emails").default(0),
  estimatedCompletion: timestamp("estimated_completion"),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default("0.00"),
  hasInitialSync: boolean("has_initial_sync").default(false),
  
  // Timeout tracking to prevent stuck syncs
  syncTimeoutAt: timestamp("sync_timeout_at"), // Absolute deadline for sync completion
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 