ALTER TABLE "email_sync_status" ADD COLUMN "oauth_error_type" varchar(50);--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "oauth_error_code" varchar(100);--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "requires_reauth" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD COLUMN "user_friendly_error" text;