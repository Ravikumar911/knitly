import { profiles } from "./schema";

// Export types for better type safety
export type User = typeof profiles.$inferSelect;
export type NewUser = typeof profiles.$inferInsert; 