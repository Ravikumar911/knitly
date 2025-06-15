ALTER TABLE "email_sync_status" ALTER COLUMN "last_synced_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "last_sync_attempt_at" timestamp;