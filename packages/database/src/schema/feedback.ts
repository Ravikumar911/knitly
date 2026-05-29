import { randomUUID } from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { profiles } from "./users";

export const feedback = sqliteTable("feedback", {
  id: text("id")
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  userId: text("user_id").references(() => profiles.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  priority: text("priority").default("medium"),
  status: text("status").default("open"),
  userEmail: text("user_email"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(
    () => new Date(),
  ),
});

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
