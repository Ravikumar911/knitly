import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Categories for transactions with proper self-reference handling
export const transactionCategories = pgTable("transaction_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  parentId: uuid("parent_id"), // Self-reference handled in relations
  icon: text("icon"),
  color: varchar("color", { length: 7 }), // Hex color code
  type: varchar("type", { length: 20 }).notNull(), // EXPENSE, INCOME, TRANSFER
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// After definition, add the foreign key constraint
export const categoryForeignKey = {
  parentId: transactionCategories.id
}; 