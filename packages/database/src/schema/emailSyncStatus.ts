import { randomUUID } from "node:crypto";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { profiles } from "./users";

export const emailSyncStatus = sqliteTable("email_sync_status", {
  id: text("id")
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
  lastSyncAttemptAt: integer("last_sync_attempt_at", { mode: "timestamp_ms" }),
  nextPageToken: text("next_page_token"),
  syncStatus: text("sync_status").default("complete"),
  errorDetails: text("error_details"),
  oauthErrorType: text("oauth_error_type"),
  oauthErrorCode: text("oauth_error_code"),
  requiresReauth: integer("requires_reauth", { mode: "boolean" }).default(false),
  userFriendlyError: text("user_friendly_error"),
  totalEmails: integer("total_emails"),
  processedEmails: integer("processed_emails").default(0),
  estimatedCompletion: integer("estimated_completion", { mode: "timestamp_ms" }),
  progressPercentage: real("progress_percentage").default(0),
  hasInitialSync: integer("has_initial_sync", { mode: "boolean" }).default(false),
  syncTimeoutAt: integer("sync_timeout_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});
