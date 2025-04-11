DROP TABLE "email_threads" CASCADE;--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "next_page_token" varchar(255);--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "sync_status" varchar(50) DEFAULT 'complete';--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "error_details" text;