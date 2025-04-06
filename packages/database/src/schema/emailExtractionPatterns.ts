import { pgTable, boolean, timestamp, uuid, varchar, text, integer } from "drizzle-orm/pg-core";
import { financialInstitutions } from "./financialInstitutions";

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