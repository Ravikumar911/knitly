import { pgTable, boolean, timestamp, uuid, varchar, text, doublePrecision } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { financialInstruments } from "./financialInstruments";
import { transactionCategories } from "./transactionCategories";
import { merchants } from "./merchants";
import { employers } from "./employers";
import { parsedEmails } from "./parsedEmails";

// Transactions table - the core of the system
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  instrumentId: uuid("instrument_id").references(() => financialInstruments.id, { onDelete: "set null" }),
  
  // Transaction details
  amount: doublePrecision("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  type: varchar("type", { length: 20 }).notNull(), // DEBIT, CREDIT, TRANSFER
  
  // Metadata
  transactionDate: timestamp("transaction_date", { mode: 'date' }).notNull(),
  valueDate: timestamp("value_date", { mode: 'date' }), // When the transaction was actually processed
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
  
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
}); 