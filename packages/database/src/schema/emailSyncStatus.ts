import { pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const emailSyncStatus = pgTable("email_sync_status", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  lastSyncedAt: timestamp("last_synced_at").notNull(),
  nextPageToken: varchar("next_page_token", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 50 }).default("complete"),
  errorDetails: text("error_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 