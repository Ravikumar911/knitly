-- Skip these statements if the table has been deleted
-- ALTER TABLE "public"."auth.users" SET SCHEMA "auth";
-- --> statement-breakpoint
-- ALTER TABLE "auth"."auth.users" RENAME TO "users";
-- --> statement-breakpoint

-- Drop constraints first
ALTER TABLE "token_access_logs" DROP CONSTRAINT IF EXISTS "token_access_logs_user_id_auth.users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_google_tokens" DROP CONSTRAINT IF EXISTS "user_google_tokens_user_id_auth.users_id_fk";
--> statement-breakpoint

-- Add constraints referencing the auth.users table
ALTER TABLE "token_access_logs" ADD CONSTRAINT "token_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_google_tokens" ADD CONSTRAINT "user_google_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;