import { pgTable, text, timestamp, uuid, varchar, unique } from "drizzle-orm/pg-core";

// Financial institution types like banks, credit card issuers, investment platforms
export const financialInstitutions = pgTable("financial_institutions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 50 }), // For acronyms like SBI
  logo: text("logo"), // URL to logo
  type: varchar("type", { length: 50 }), // BANK, CREDIT_ISSUER, INVESTMENT_PLATFORM, etc.
  website: text("website"),
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

// Enforce uniqueness on either name or short_name
export const financialInstitutionsConstraints = unique("institution_name_uniqueness").on(
  financialInstitutions.name, 
  financialInstitutions.shortName
); 