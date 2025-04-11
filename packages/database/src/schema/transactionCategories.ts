import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";

// Categories for transactions with proper self-reference handling
export const transactionCategories = pgTable("transaction_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  parentId: uuid("parent_id").references((): any => transactionCategories.id), // Self-reference with type assertion
  icon: text("icon"),
  color: varchar("color", { length: 7 }), // Hex color code
  type: varchar("type", { length: 20 }).notNull(), // EXPENSE, INCOME, TRANSFER
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

// After definition, add the foreign key constraint
export const categoryForeignKey = {
  parentId: transactionCategories.id
}; 