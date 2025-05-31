import { pgTable, boolean, timestamp, uuid, varchar, text, doublePrecision, jsonb, decimal } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { parsedEmails } from "./parsedEmails";

// Enhanced transactions table with merchant-specific support
export const transactionsV2 = pgTable("transactions_v2", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  parsedEmailId: uuid("parsed_email_id").references(() => parsedEmails.id, { onDelete: "set null" }),
  
  // Merchant identification
  merchantId: varchar("merchant_id", { length: 100 }), // e.g., "swiggy", "phonepe"
  merchantCode: varchar("merchant_code", { length: 50 }), // e.g., "SWIGGY", "PHONEPE"
  merchantName: varchar("merchant_name", { length: 255 }), // Display name
  
  // Core transaction data
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  type: varchar("type", { length: 20 }).notNull(), // DEBIT, CREDIT
  status: varchar("status", { length: 20 }).default("COMPLETED"), // COMPLETED, PENDING, FAILED, CANCELLED
  
  // Transaction timing
  transactionDate: timestamp("transaction_date", { mode: 'date' }).notNull(),
  
  // Transaction description and categorization
  description: text("description"),
  category: varchar("category", { length: 100 }),
  
  // Payment method
  paymentMethod: varchar("payment_method", { length: 100 }),
  
  // Reference IDs (flexible JSON storage)
  referenceIds: jsonb("reference_ids").default({}),
  
  // Location data (JSON for flexibility)
  location: jsonb("location"),
  
  // Merchant-specific data (flexible JSON storage for custom fields)
  merchantData: jsonb("merchant_data").default({}),
  
  // Extraction metadata
  extractionConfidence: doublePrecision("extraction_confidence"),
  schemaUsed: varchar("schema_used", { length: 100 }), // Which merchant schema was used
  
  // Data source and verification
  dataSource: varchar("data_source", { length: 20 }), // EMAIL_BODY, PDF_ATTACHMENT, BOTH
  isVerified: boolean("is_verified").default(false),
  verificationStatus: varchar("verification_status", { length: 20 }).default("UNVERIFIED"),
  
  // Duplicate detection
  duplicateOf: uuid("duplicate_of"),
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

// Index suggestions for common queries
// CREATE INDEX idx_transactions_v2_user_id ON transactions_v2(user_id);
// CREATE INDEX idx_transactions_v2_merchant_id ON transactions_v2(merchant_id);
// CREATE INDEX idx_transactions_v2_transaction_date ON transactions_v2(transaction_date);
// CREATE INDEX idx_transactions_v2_reference_ids ON transactions_v2 USING GIN(reference_ids);
// CREATE INDEX idx_transactions_v2_merchant_data ON transactions_v2 USING GIN(merchant_data); 