import { randomUUID } from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { profiles } from "./users";

export const chats = sqliteTable("chats", {
  id: text("id")
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});
