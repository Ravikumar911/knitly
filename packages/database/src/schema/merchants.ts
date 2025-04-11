import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { transactionCategories } from "./transactionCategories";

// Merchants for transaction categorization
export const merchants = pgTable("merchants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }), // General category like FOOD, RETAIL, etc.
  logo: text("logo"),
  website: text("website"),
  defaultCategoryId: uuid("default_category_id").references(() => transactionCategories.id),
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
}); 