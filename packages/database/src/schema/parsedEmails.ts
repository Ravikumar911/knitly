import { pgTable, boolean, timestamp, uuid, varchar, text, unique } from "drizzle-orm/pg-core";
import { profiles } from "./users";

// Parsed emails
export const parsedEmails = pgTable("parsed_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  
  // Email metadata
  emailId: varchar("email_id", { length: 255 }).notNull(), // Gmail message ID
  threadId: varchar("thread_id", { length: 255 }), // Gmail thread ID
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