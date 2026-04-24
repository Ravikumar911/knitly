import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const LOCAL_USER_ID = "local";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey().notNull(),
  email: text("email"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});
