import { pgTable, boolean, timestamp, uuid, varchar, text, jsonb, integer } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { transactions } from "./transactions";

// Store transaction reconciliation results
export const reconciliationResults = pgTable("reconciliation_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  
  // Reconciliation metadata
  originalCount: integer("original_count").notNull(), // Number of transactions before deduplication
  dedupedCount: integer("deduped_count").notNull(), // Number of transactions after deduplication
  duplicateCount: integer("duplicate_count").notNull(), // Number of duplicate transactions found
  
  // Detailed results - stored as JSONB for flexibility
  duplicateGroups: jsonb("duplicate_groups"), // Groups of duplicate transactions with confidence scores
  transactionsToMerge: jsonb("transactions_to_merge"), // Map of primary transaction ID to duplicate transaction IDs
  
  // Status
  status: varchar("status", { length: 20 }).default("PENDING"), // PENDING, APPLIED, REJECTED
  appliedAt: timestamp("applied_at", { mode: 'date' }), // When deduplication was applied
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
}); 