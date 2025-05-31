ALTER TABLE "ai_analysis" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_extraction_patterns" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_institutions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_instruments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transaction_categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "merchants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "merchant_v2" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transaction_v2" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_analysis" CASCADE;--> statement-breakpoint
DROP TABLE "email_extraction_patterns" CASCADE;--> statement-breakpoint
DROP TABLE "financial_institutions" CASCADE;--> statement-breakpoint
DROP TABLE "financial_instruments" CASCADE;--> statement-breakpoint
DROP TABLE "transaction_categories" CASCADE;--> statement-breakpoint
DROP TABLE "merchants" CASCADE;--> statement-breakpoint
DROP TABLE "transactions" CASCADE;--> statement-breakpoint
DROP TABLE "merchant_v2" CASCADE;--> statement-breakpoint
DROP TABLE "transaction_v2" CASCADE;--> statement-breakpoint
-- ALTER TABLE "parsed_emails" DROP CONSTRAINT "parsed_emails_ai_analysis_id_ai_analysis_id_fk";
--> statement-breakpoint
ALTER TABLE "parsed_emails" DROP COLUMN "ai_analysis_id";