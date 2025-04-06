import { users } from "./schema";

// Export types for better type safety
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert; 