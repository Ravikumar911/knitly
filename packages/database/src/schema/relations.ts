import { relations } from "drizzle-orm";
import { users } from "./users";
import { financialInstitutions } from "./financialInstitutions";
import { financialInstruments } from "./financialInstruments";
import { parsedEmails } from "./parsedEmails";
import { monthlySummaries } from "./monthlySummaries";
import { employers } from "./employers";
import { transactionCategories } from "./transactionCategories";
import { merchants } from "./merchants";
import { emailExtractionPatterns } from "./emailExtractionPatterns";
import { transactions } from "./transactions";
import { upiHandles } from "./upiHandles";
import { authUsers, userGoogleTokens, tokenAccessLogs } from "./tokens";

// Define relations after all tables are defined to avoid circular references
export const usersRelations = relations(users, ({ many }) => ({
  financialInstruments: many(financialInstruments),
  parsedEmails: many(parsedEmails),
  monthlySummaries: many(monthlySummaries),
  employers: many(employers),
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

export const financialInstitutionsRelations = relations(financialInstitutions, ({ many }) => ({
  financialInstruments: many(financialInstruments),
  emailExtractionPatterns: many(emailExtractionPatterns),
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
  upiHandles: many(upiHandles),
}));

export const employersRelations = relations(employers, ({ one, many }) => ({
  user: one(users, {
    fields: [employers.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const parsedEmailsRelations = relations(parsedEmails, ({ one, many }) => ({
  user: one(users, {
    fields: [parsedEmails.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const financialInstrumentsRelations = relations(financialInstruments, ({ one, many }) => ({
  user: one(users, {
    fields: [financialInstruments.userId],
    references: [users.id],
  }),
  institution: one(financialInstitutions, {
    fields: [financialInstruments.institutionId],
    references: [financialInstitutions.id],
  }),
  transactions: many(transactions),
  monthlySummaries: many(monthlySummaries),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  instrument: one(financialInstruments, {
    fields: [transactions.instrumentId],
    references: [financialInstruments.id],
  }),
  category: one(transactionCategories, {
    fields: [transactions.categoryId],
    references: [transactionCategories.id],
  }),
  merchant: one(merchants, {
    fields: [transactions.merchantId],
    references: [merchants.id],
  }),
  employer: one(employers, {
    fields: [transactions.employerId],
    references: [employers.id],
  }),
  parsedEmail: one(parsedEmails, {
    fields: [transactions.parsedEmailId],
    references: [parsedEmails.id],
  }),
}));

export const monthlySummariesRelations = relations(monthlySummaries, ({ one }) => ({
  user: one(users, {
    fields: [monthlySummaries.userId],
    references: [users.id],
  }),
  instrument: one(financialInstruments, {
    fields: [monthlySummaries.instrumentId],
    references: [financialInstruments.id],
  }),
}));

export const emailExtractionPatternsRelations = relations(emailExtractionPatterns, ({ one }) => ({
  institution: one(financialInstitutions, {
    fields: [emailExtractionPatterns.institutionId],
    references: [financialInstitutions.id],
  }),
}));

export const upiHandlesRelations = relations(upiHandles, ({ one }) => ({
  user: one(users, {
    fields: [upiHandles.userId],
    references: [users.id],
  }),
  merchant: one(merchants, {
    fields: [upiHandles.merchantId],
    references: [merchants.id],
  }),
})); 