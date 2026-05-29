import { randomUUID } from "node:crypto";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { profiles } from "./users";

export const parsedEmails = sqliteTable(
  "parsed_emails",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    snippet: text("snippet"),
    senderEmailId: text("sender_email_id"),
    threadId: text("thread_id"),
    subject: text("subject"),
    receivedDate: integer("received_date", { mode: "timestamp_ms" }),
    parseSuccess: integer("parse_success", { mode: "boolean" }).default(false),
    parseErrors: text("parse_errors"),
    rawContent: text("raw_content"),
    attachmentStoragePath: text("attachment_storage_path", {
      mode: "json",
    }).$type<string[] | null>(),
    parsedAt: integer("parsed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    userThreadUnique: uniqueIndex("parsed_emails_user_id_thread_id").on(
      table.userId,
      table.threadId,
    ),
  }),
);
