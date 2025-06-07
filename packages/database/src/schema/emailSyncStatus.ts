import { pgTable, timestamp, uuid, varchar, text, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const emailSyncStatus = pgTable("email_sync_status", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  lastSyncedAt: timestamp("last_synced_at").notNull(),
  nextPageToken: varchar("next_page_token", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 50 }).default("complete"),
  errorDetails: text("error_details"),
  
  // New progress tracking fields
  totalEmails: integer("total_emails"),
  processedEmails: integer("processed_emails").default(0),
  estimatedCompletion: timestamp("estimated_completion"),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default("0.00"),
  hasInitialSync: boolean("has_initial_sync").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 