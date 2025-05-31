import { relations } from "drizzle-orm";
import { pgSchema, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { parsedEmails } from "./parsedEmails";
import { userGoogleTokens, tokenAccessLogs } from "./tokens";
import { transactionsV2 } from "./transactionsV2";

const auth = pgSchema('auth');
const authUsers = auth.table('users', {
	id: uuid().primaryKey().notNull(),
});

// Define relations after all tables are defined to avoid circular references
export const profilesRelations = relations(profiles, ({ many }) => ({
  parsedEmails: many(parsedEmails),
}));

// Relations for auth.users (placeholder for Supabase Auth)
export const authUsersRelations = relations(authUsers, ({ one }) => ({
  googleTokens: one(userGoogleTokens),
}));

// Relations for userGoogleTokens
export const userGoogleTokensRelations = relations(userGoogleTokens, ({ one }) => ({
  user: one(authUsers, {
    fields: [userGoogleTokens.userId],
    references: [authUsers.id],
  }),
}));

// Relations for tokenAccessLogs
export const tokenAccessLogsRelations = relations(tokenAccessLogs, ({ one }) => ({
  user: one(authUsers, {
    fields: [tokenAccessLogs.userId],
    references: [authUsers.id],
  }),
}));


export const parsedEmailsRelations = relations(parsedEmails, ({ one, many }) => ({
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


export const transactionsV2Relations = relations(transactionsV2, ({ one }) => ({
  user: one(profiles, {
    fields: [transactionsV2.userId],
    references: [profiles.id],
  }),
}));
