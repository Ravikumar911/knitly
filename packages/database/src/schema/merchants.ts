import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { transactionCategories } from "./transactionCategories";

// Merchants/payees for transactions
export const merchants = pgTable("merchants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  logo: text("logo"),
  website: text("website"),
  defaultCategoryId: uuid("default_category_id").references(() => transactionCategories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 