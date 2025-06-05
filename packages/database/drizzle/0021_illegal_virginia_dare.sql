ALTER TABLE "email_sync_status" ADD COLUMN "total_emails" integer;--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "processed_emails" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "estimated_completion" timestamp;--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "progress_percentage" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "has_initial_sync" boolean DEFAULT false;