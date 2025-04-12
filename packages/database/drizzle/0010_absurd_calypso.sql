ALTER TABLE "ai_analysis" DROP CONSTRAINT "ai_analysis_parsed_email_id_parsed_emails_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_analysis" ADD COLUMN "parsed_thread_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ai_analysis" DROP COLUMN "parsed_email_id";