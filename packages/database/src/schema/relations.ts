import { relations } from "drizzle-orm";
import { pgSchema, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { financialInstitutions } from "./financialInstitutions";
import { financialInstruments } from "./financialInstruments";
import { parsedEmails } from "./parsedEmails";
import { transactionCategories } from "./transactionCategories";
import { merchants } from "./merchants";
import { transactions } from "./transactions";
import { userGoogleTokens, tokenAccessLogs } from "./tokens";

const auth = pgSchema('auth');
const authUsers = auth.table('users', {
	id: uuid().primaryKey().notNull(),
});

// Define relations after all tables are defined to avoid circular references
export const profilesRelations = relations(profiles, ({ many }) => ({
  financialInstruments: many(financialInstruments),
  parsedEmails: many(parsedEmails),
  transactions: many(transactions),
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


export const transactionCategoriesRelations = relations(transactionCategories, ({ many, one }) => ({
  childCategories: many(transactionCategories, { relationName: 'parent_child' }),
  parentCategory: one(transactionCategories, {
    fields: [transactionCategories.parentId],
    references: [transactionCategories.id],
    relationName: 'parent_child'
  }),
  transactions: many(transactions),
  merchants: many(merchants, { relationName: 'default_category' }),
}));

export const merchantsRelations = relations(merchants, ({ many, one }) => ({
  defaultCategory: one(transactionCategories, {
    fields: [merchants.defaultCategoryId],
    references: [transactionCategories.id],
    relationName: 'default_category'
  }),
  transactions: many(transactions),
}));


export const parsedEmailsRelations = relations(parsedEmails, ({ one, many }) => ({
  user: one(profiles, {
    fields: [parsedEmails.userId],
    references: [profiles.id],
  }),
  transactions: many(transactions),
}));

export const financialInstrumentsRelations = relations(financialInstruments, ({ one, many }) => ({
  user: one(profiles, {
    fields: [financialInstruments.userId],
    references: [profiles.id],
  }),
  institution: one(financialInstitutions, {
    fields: [financialInstruments.institutionId],
    references: [financialInstitutions.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(profiles, {
    fields: [transactions.userId],
    references: [profiles.id],
  }),
  instrument: one(financialInstruments, {
    fields: [transactions.instrumentId],
    references: [financialInstruments.id],
  }),
  category: one(transactionCategories, {
    fields: [transactions.category],
    references: [transactionCategories.id],
  }),
  merchant: one(merchants, {
    fields: [transactions.merchantId],
    references: [merchants.id],
  }),
  parsedEmail: one(parsedEmails, {
    fields: [transactions.parsedEmailId],
    references: [parsedEmails.id],
  }),
  duplicateOfTransaction: one(transactions, {
    fields: [transactions.duplicateOf],
    references: [transactions.id],
  }),
}));
