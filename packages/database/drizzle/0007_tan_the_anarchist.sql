ALTER TABLE "transactions" DROP CONSTRAINT "transactions_employer_id_employers_id_fk";
--> statement-breakpoint
ALTER TABLE "parsed_emails" ADD COLUMN "sender_email_id" varchar(255);--> statement-breakpoint
ALTER TABLE "parsed_emails" ADD COLUMN "snippet" text;--> statement-breakpoint
ALTER TABLE "parsed_emails" DROP COLUMN "email_id";--> statement-breakpoint
ALTER TABLE "parsed_emails" DROP COLUMN "detected_provider";--> statement-breakpoint
ALTER TABLE "parsed_emails" DROP COLUMN "email_type";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "employer_id";