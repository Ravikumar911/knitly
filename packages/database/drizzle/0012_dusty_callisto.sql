ALTER TABLE "reconciliation_results" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "reconciliation_results" CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "duplicate_of" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_duplicate_of_transactions_id_fk" FOREIGN KEY ("duplicate_of") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;