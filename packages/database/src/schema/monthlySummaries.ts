import { pgTable, boolean, timestamp, uuid, integer, text, doublePrecision, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { financialInstruments } from "./financialInstruments";

// Monthly summaries for quick reporting
export const monthlySummaries = pgTable("monthly_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  instrumentId: uuid("instrument_id").references(() => financialInstruments.id),
  
  // Time period
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  
  // Summary data
  totalIncome: doublePrecision("total_income").default(0),
  totalExpense: doublePrecision("total_expense").default(0),
  totalSavings: doublePrecision("total_savings").default(0),
  
  // Category breakdowns stored as JSON
  categoryBreakdown: text("category_breakdown"), // JSON string of category:amount pairs
  merchantBreakdown: text("merchant_breakdown"), // JSON string of merchant:amount pairs
  
  // Status
  isComplete: boolean("is_complete").default(false), // Whether all data for the month is processed
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enforce uniqueness per user per month per instrument (if specified)
export const monthlySummariesConstraints = unique("monthly_summaries_user_year_month_instrument").on(
  monthlySummaries.userId, 
  monthlySummaries.year, 
  monthlySummaries.month, 
  monthlySummaries.instrumentId
); 