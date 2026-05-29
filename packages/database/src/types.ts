import { profiles } from "./schema";
import { emailSyncStatus } from "./schema/emailSyncStatus";
import { parsedEmails } from "./schema/parsedEmails";
import { transactionsV2 } from "./schema/transactionsV2";

// Export types for better type safety
export type User = typeof profiles.$inferSelect;
export type NewUser = typeof profiles.$inferInsert;

export type EmailSyncStatus = typeof emailSyncStatus.$inferSelect;
export type NewEmailSyncStatus = typeof emailSyncStatus.$inferInsert;

export type ParsedEmail = typeof parsedEmails.$inferSelect;
export type NewParsedEmail = typeof parsedEmails.$inferInsert;

export type Transaction = typeof transactionsV2.$inferSelect;
export type NewTransaction = typeof transactionsV2.$inferInsert;
