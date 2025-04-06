import { pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { users } from "./users";
import { merchants } from "./merchants";

// UPI handles lookup table for easier matching
export const upiHandles = pgTable("upi_handles", {
  id: uuid("id").defaultRandom().primaryKey(),
  handle: varchar("handle", { length: 255 }).notNull().unique(),
  provider: varchar("provider", { length: 50 }), // PhonePe, Google Pay, etc.
  alias: varchar("alias", { length: 255 }), // Human-readable name
  userId: text("user_id").references(() => users.id), // If this handle belongs to a user
  merchantId: uuid("merchant_id").references(() => merchants.id), // If this handle belongs to a merchant
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 