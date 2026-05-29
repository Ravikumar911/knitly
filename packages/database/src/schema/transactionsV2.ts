import { randomUUID } from "node:crypto";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { profiles } from "./users";
import { parsedEmails } from "./parsedEmails";

export const transactionsV2 = sqliteTable("transactions_v2", {
  id: text("id")
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  parsedEmailId: text("parsed_email_id").references(() => parsedEmails.id, {
    onDelete: "set null",
  }),
  merchantId: text("merchant_id"),
  merchantCode: text("merchant_code"),
  merchantName: text("merchant_name"),
  amount: real("amount").notNull(),
  currency: text("currency").default("INR"),
  type: text("type").notNull(),
  status: text("status").default("COMPLETED"),
  transactionDate: integer("transaction_date", {
    mode: "timestamp_ms",
  }).notNull(),
  description: text("description"),
  category: text("category"),
  paymentMethod: text("payment_method"),
  referenceIds: text("reference_ids", { mode: "json" })
    .$type<Record<string, unknown>>()
    .default({}),
  location: text("location", { mode: "json" }).$type<Record<
    string,
    unknown
  > | null>(),
  merchantData: text("merchant_data", { mode: "json" })
    .$type<Record<string, unknown>>()
    .default({}),
  extractionConfidence: real("extraction_confidence"),
  schemaUsed: text("schema_used"),
  dataSource: text("data_source"),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false),
  verificationStatus: text("verification_status").default("UNVERIFIED"),
  duplicateOf: text("duplicate_of"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});
