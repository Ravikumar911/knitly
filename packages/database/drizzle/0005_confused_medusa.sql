ALTER TABLE "email_extraction_patterns" DROP CONSTRAINT "email_extraction_patterns_institution_id_financial_institutions_id_fk";
--> statement-breakpoint
ALTER TABLE "email_extraction_patterns" DROP COLUMN "institution_id";