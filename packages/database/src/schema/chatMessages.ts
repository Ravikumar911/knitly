import { randomUUID } from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { chats } from "./chat";

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id")
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: text("parts", { mode: "json" }).$type<unknown>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});
