import { emailExtractionPatterns, profiles } from "./schema";
import { emailSyncStatus } from "./schema/emailSyncStatus";

// Export types for better type safety
export type User = typeof profiles.$inferSelect;
export type NewUser = typeof profiles.$inferInsert; 

export type EmailExtractionPattern = typeof emailExtractionPatterns.$inferSelect;
export type NewEmailExtractionPattern = typeof emailExtractionPatterns.$inferInsert;

export type EmailSyncStatus = typeof emailSyncStatus.$inferSelect;
export type NewEmailSyncStatus = typeof emailSyncStatus.$inferInsert;