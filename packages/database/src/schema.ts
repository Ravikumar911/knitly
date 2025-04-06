import { integer, pgTable, text, timestamp, varchar, uuid, boolean, doublePrecision, primaryKey, real, date, unique, index } from "drizzle-orm/pg-core";
import { relations, type InferSelectModel } from "drizzle-orm";

// Core user table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Financial institution types like banks, credit card issuers, investment platforms
export const financialInstitutions = pgTable("financial_institutions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 50 }), // For acronyms like SBI
  logo: text("logo"), // URL to logo
  type: varchar("type", { length: 50 }), // BANK, CREDIT_ISSUER, INVESTMENT_PLATFORM, etc.
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enforce uniqueness on either name or short_name
export const financialInstitutionsConstraints = unique("institution_name_uniqueness").on(
  financialInstitutions.name, 
  financialInstitutions.shortName
);

// Categories for transactions with proper self-reference handling
export const transactionCategories = pgTable("transaction_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  parentId: uuid("parent_id"), // Self-reference handled in relations
  icon: text("icon"),
  color: varchar("color", { length: 7 }), // Hex color code
  type: varchar("type", { length: 20 }).notNull(), // EXPENSE, INCOME, TRANSFER
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// After definition, add the foreign key constraint
export const categoryForeignKey = {
  parentId: transactionCategories.id
};

// Merchants/payees for transactions
export const merchants = pgTable("merchants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  logo: text("logo"),
  website: text("website"),
  defaultCategoryId: uuid("default_category_id").references(() => transactionCategories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employers for salary detection
export const employers = pgTable("employers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Parsed emails
export const parsedEmails = pgTable("parsed_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Email metadata
  emailId: varchar("email_id", { length: 255 }).notNull(), // Gmail message ID
  subject: text("subject"),
  sender: varchar("sender", { length: 255 }),
  receivedDate: timestamp("received_date"),
  
  // Parsing metadata
  detectedProvider: varchar("detected_provider", { length: 100 }), // Which financial institution sent this
  emailType: varchar("email_type", { length: 50 }), // TRANSACTION, STATEMENT, ALERT, etc.
  parseSuccess: boolean("parse_success").default(false),
  parseErrors: text("parse_errors"),
  rawContent: text("raw_content"), // Store the raw email content for debugging
  
  parsedAt: timestamp("parsed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Add unique constraint to prevent duplicate processing
export const parsedEmailsConstraints = unique("parsed_emails_user_id_email_id").on(
  parsedEmails.userId, 
  parsedEmails.emailId
);

// Financial instruments like specific accounts, cards, UPI handles
export const financialInstruments = pgTable("financial_instruments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  institutionId: uuid("institution_id").references(() => financialInstitutions.id),
  
  // Basic info
  name: varchar("name", { length: 255 }).notNull(), // User-friendly name
  type: varchar("type", { length: 50 }).notNull(), // SAVINGS_ACCOUNT, CREDIT_CARD, UPI, INVESTMENT, etc.
  
  // Account-specific details
  accountNumber: varchar("account_number", { length: 255 }), // Last 4 digits or masked
  cardNumber: varchar("card_number", { length: 255 }), // Last 4 digits or masked
  cardType: varchar("card_type", { length: 50 }), // VISA, MASTERCARD, RUPAY
  cardCategory: varchar("card_category", { length: 50 }), // PLATINUM, GOLD, etc.
  expiryDate: varchar("expiry_date", { length: 10 }), // MM/YY format
  
  // UPI-specific details
  upiHandle: varchar("upi_handle", { length: 255 }),
  upiProvider: varchar("upi_provider", { length: 50 }), // GooglePay, PhonePe, etc.
  
  // Investment-specific details
  investmentType: varchar("investment_type", { length: 50 }), // MF, STOCK, FD, etc.
  
  // General
  balance: doublePrecision("balance"), // Current balance
  creditLimit: doublePrecision("credit_limit"), // For credit cards
  currency: varchar("currency", { length: 3 }).default("INR"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Transactions table - the core of the system
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  instrumentId: uuid("instrument_id").references(() => financialInstruments.id, { onDelete: "set null" }),
  
  // Transaction details
  amount: doublePrecision("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  type: varchar("type", { length: 20 }).notNull(), // DEBIT, CREDIT, TRANSFER
  
  // Metadata
  transactionDate: timestamp("transaction_date").notNull(),
  valueDate: timestamp("value_date"), // When the transaction was actually processed
  description: text("description"), // Original description from statement
  notes: text("notes"), // User notes
  
  // Classifications
  categoryId: uuid("category_id").references(() => transactionCategories.id),
  merchantId: uuid("merchant_id").references(() => merchants.id),
  employerId: uuid("employer_id").references(() => employers.id), // For salary credits
  
  // UPI specific
  upiReferenceId: varchar("upi_reference_id", { length: 100 }),
  upiTransactionId: varchar("upi_transaction_id", { length: 100 }),
  counterpartyUpiHandle: varchar("counterparty_upi_handle", { length: 255 }),
  
  // Source tracking
  parsedEmailId: uuid("parsed_email_id").references(() => parsedEmails.id),
  isRecurring: boolean("is_recurring").default(false),
  isVerified: boolean("is_verified").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Monthly summaries for quick reporting
export const monthlySummaries = pgTable("monthly_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  instrumentId: uuid("instrument_id").references(() => financialInstruments.id),
  
  // Time period
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  
  // Summary data
  totalIncome: doublePrecision("total_income").default(0),
  totalExpense: doublePrecision("total_expense").default(0),
  totalSavings: doublePrecision("total_savings").default(0),
  
  // Category breakdowns stored as JSON
  categoryBreakdown: text("category_breakdown"), // JSON string of category:amount pairs
  merchantBreakdown: text("merchant_breakdown"), // JSON string of merchant:amount pairs
  
  // Status
  isComplete: boolean("is_complete").default(false), // Whether all data for the month is processed
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enforce uniqueness per user per month per instrument (if specified)
export const monthlySummariesConstraints = unique("monthly_summaries_user_year_month_instrument").on(
  monthlySummaries.userId, 
  monthlySummaries.year, 
  monthlySummaries.month, 
  monthlySummaries.instrumentId
);

// Email extraction patterns to help with parsing
export const emailExtractionPatterns = pgTable("email_extraction_patterns", {
  id: uuid("id").defaultRandom().primaryKey(),
  institutionId: uuid("institution_id").references(() => financialInstitutions.id),
  
  // Pattern details
  emailPattern: varchar("email_pattern", { length: 255 }), // Pattern to match sender email
  subjectPattern: varchar("subject_pattern", { length: 255 }), // Pattern to match subject
  bodyPattern: text("body_pattern"), // Pattern to extract data from body
  
  // What kind of data this pattern extracts
  extractionType: varchar("extraction_type", { length: 50 }).notNull(), // TRANSACTION, BALANCE, STATEMENT, etc.
  
  // Pattern configuration
  config: text("config"), // JSON with extraction configuration
  priority: integer("priority").default(0), // Higher priority patterns are tried first
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// UPI handles lookup table for easier matching
export const upiHandles = pgTable("upi_handles", {
  id: uuid("id").defaultRandom().primaryKey(),
  handle: varchar("handle", { length: 255 }).notNull().unique(),
  provider: varchar("provider", { length: 50 }), // PhonePe, Google Pay, etc.
  alias: varchar("alias", { length: 255 }), // Human-readable name
  userId: text("user_id").references(() => users.id), // If this handle belongs to a user
  merchantId: uuid("merchant_id").references(() => merchants.id), // If this handle belongs to a merchant
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations after all tables are defined to avoid circular references
export const usersRelations = relations(users, ({ many }) => ({
  financialInstruments: many(financialInstruments),
  parsedEmails: many(parsedEmails),
  monthlySummaries: many(monthlySummaries),
  employers: many(employers),
}));

export const financialInstitutionsRelations = relations(financialInstitutions, ({ many }) => ({
  financialInstruments: many(financialInstruments),
  extractionPatterns: many(emailExtractionPatterns),
}));

// Define the transaction categories relations with proper typing
export const transactionCategoriesRelations = relations(transactionCategories, ({ one, many }) => ({
  parent: one(transactionCategories, {
    fields: [transactionCategories.parentId],
    references: [transactionCategories.id],
  }),
  children: many(transactionCategories),
  transactions: many(transactions),
  merchants: many(merchants),
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  defaultCategory: one(transactionCategories, {
    fields: [merchants.defaultCategoryId],
    references: [transactionCategories.id],
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
