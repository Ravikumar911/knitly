import { pgTable, boolean, timestamp, uuid, varchar, text, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { parsedEmails } from "./parsedEmails";

// Store AI analysis results from finwiseAI
export const aiAnalysis = pgTable("ai_analysis", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  parsedThreadId: varchar("parsed_thread_id", { length: 255 }),
  
  // Source metadata
  detectedProvider: varchar("detected_provider", { length: 255 }), // e.g., "SWIGGY", "AMAZON", "PHONEPE"
  emailType: varchar("email_type", { length: 50 }), // e.g., "ORDER_CONFIRMATION", "PAYMENT_CONFIRMATION"
  emailSubject: text("email_subject"),
  
  // Transaction details (stored as JSONB for flexibility)
  transactionData: jsonb("transaction_data"), // Stores the complete transaction object with all fields
  
  // Analysis metadata
  parseSuccess: boolean("parse_success").notNull(),
  parseErrors: text("parse_errors").array(),
  confidenceScore: doublePrecision("confidence_score"),
  
  // Source verification
  dataSource: varchar("data_source", { length: 20 }), // EMAIL_BODY, PDF_ATTACHMENT, BOTH
  verificationStatus: varchar("verification_status", { length: 20 }).default("UNVERIFIED"), // VERIFIED, UNVERIFIED, SUSPICIOUS
  
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { mode: 'date' }).defaultNow().notNull(),
}); 