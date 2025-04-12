import { pgTable, boolean, timestamp, uuid, varchar, text, unique, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { profiles } from "./users";


// Parsed emails
export const parsedEmails = pgTable("parsed_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  messageId: varchar("message_id", { length: 255 }).notNull(),
  
  // Email metadata
  senderEmailId: varchar("sender_email_id", { length: 255 }),
  snippet: text("snippet"),
  threadId: varchar("thread_id", { length: 255 }), // Gmail thread ID
  subject: text("subject"),
  sender: varchar("sender", { length: 255 }),
  receivedDate: timestamp("received_date"),
  
  // Parsing metadata
  parseSuccess: boolean("parse_success").default(false),
  parseErrors: text("parse_errors"),
  rawContent: text("raw_content"), // Store the raw email content for debugging
  
  // Attachment information
  attachmentStoragePath: jsonb("attachment_storage_path"), // Path to attachment in Supabase storage
  
  parsedAt: timestamp("parsed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Add unique constraint to prevent duplicate processing
export const parsedEmailsConstraints = unique("parsed_emails_user_id_thread_id").on(
  parsedEmails.userId, 
  parsedEmails.threadId
); 