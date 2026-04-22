import { relations } from "drizzle-orm";
import { profiles } from "./users";
import { parsedEmails } from "./parsedEmails";
import { transactionsV2 } from "./transactionsV2";
import { chats } from "./chat";
import { chatMessages } from "./chatMessages";

export const profilesRelations = relations(profiles, ({ many }) => ({
  parsedEmails: many(parsedEmails),
  transactions: many(transactionsV2),
  chats: many(chats),
}));

export const parsedEmailsRelations = relations(parsedEmails, ({ one }) => ({
  user: one(profiles, {
    fields: [parsedEmails.userId],
    references: [profiles.id],
  }),
}));

export const transactionsRelations = relations(transactionsV2, ({ one }) => ({
  user: one(profiles, {
    fields: [transactionsV2.userId],
    references: [profiles.id],
  }),
  parsedEmail: one(parsedEmails, {
    fields: [transactionsV2.parsedEmailId],
    references: [parsedEmails.id],
  }),
  duplicateOfTransaction: one(transactionsV2, {
    fields: [transactionsV2.duplicateOf],
    references: [transactionsV2.id],
  }),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(profiles, {
    fields: [chats.userId],
    references: [profiles.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMessages.chatId],
    references: [chats.id],
  }),
}));
