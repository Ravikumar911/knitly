import { pgTable, boolean, timestamp, uuid, varchar, text, doublePrecision } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { financialInstitutions } from "./financialInstitutions";

// Financial instruments like specific accounts, cards, UPI handles
export const financialInstruments = pgTable("financial_instruments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
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
  
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
}); 