import { pgTable, boolean, timestamp, uuid, varchar, text, doublePrecision, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { financialInstruments } from "./financialInstruments";
import { merchants } from "./merchants";
import { parsedEmails } from "./parsedEmails";
import { aiAnalysis } from "./aiAnalysis";


// Transactions table - the core of the system
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  
  // Source tracking
  parsedEmailId: uuid("parsed_email_id").references(() => parsedEmails.id),
  aiAnalysisId: uuid("ai_analysis_id").references(() => aiAnalysis.id),
  
  // Core transaction data
  amount: doublePrecision("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  type: varchar("type", { length: 20 }).notNull(), // DEBIT, CREDIT, TRANSFER, REFUND
  status: varchar("status", { length: 20 }).default("COMPLETED"), // COMPLETED, PENDING, FAILED, REFUNDED
  
  // Transaction timing
  transactionDate: timestamp("transaction_date", { mode: 'date' }).notNull(),
  valueDate: timestamp("value_date", { mode: 'date' }), // When the transaction was actually processed
  
  // Transaction context
  category: varchar("category", { length: 50 }), // FOOD_DELIVERY, GROCERIES, etc.
  description: text("description"), // Original description from source
  notes: text("notes"), // User notes
  
  // Merchant information
  merchantId: uuid("merchant_id").references(() => merchants.id),
  merchantName: varchar("merchant_name", { length: 255 }),
  merchantCategory: varchar("merchant_category", { length: 50 }),
  
  // Payment method
  instrumentId: uuid("instrument_id").references(() => financialInstruments.id, { onDelete: "set null" }),
  paymentMethod: jsonb("payment_method"), // Stores type, last4, upiId, bankName
  
  // Reference IDs
  referenceIds: jsonb("reference_ids"), // Stores various reference IDs (UPI, bank, merchant)
  
  // Order details
  orderId: varchar("order_id", { length: 255 }),
  orderItems: jsonb("order_items"), // Array of items with name, quantity, price
  deliveryAddress: text("delivery_address"),
  
  // Location data
  location: jsonb("location"), // city, state, country
  
  
  // Verification
  isVerified: boolean("is_verified").default(false),
  verificationStatus: varchar("verification_status", { length: 20 }).default("UNVERIFIED"), // VERIFIED, UNVERIFIED, SUSPICIOUS
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
}); 