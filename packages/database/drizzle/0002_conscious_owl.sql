--> statement-breakpoint
CREATE TABLE "token_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_google_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider_refresh_token" text NOT NULL,
	"provider_token" text,
	"token_expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "token_access_logs" ADD CONSTRAINT "token_access_logs_user_id_auth.users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth.users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_google_tokens" ADD CONSTRAINT "user_google_tokens_user_id_auth.users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth.users"("id") ON DELETE cascade ON UPDATE no action;