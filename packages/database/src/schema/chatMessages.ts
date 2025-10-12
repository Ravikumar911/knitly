import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { chats } from "./chat";

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  parts: jsonb("parts").notNull(), // AI SDK 5.0 parts structure
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
});

