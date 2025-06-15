CREATE TABLE "email_sync_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_synced_at" timestamp NOT NULL,
	"next_page_token" varchar(255),
	"sync_status" varchar(50) DEFAULT 'complete',
	"error_details" text,
	"total_emails" integer,
	"processed_emails" integer DEFAULT 0,
	"estimated_completion" timestamp,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00',
	"has_initial_sync" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'open',
	"user_email" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parsed_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_email_id" varchar(255),
	"snippet" text,
	"thread_id" varchar(255),
	"subject" text,
	"received_date" timestamp,
	"parse_success" boolean DEFAULT false,
	"parse_errors" text,
	"raw_content" text,
	"attachment_storage_path" jsonb,
	"parsed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
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
CREATE TABLE "transactions_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parsed_email_id" uuid,
	"merchant_id" varchar(100),
	"merchant_code" varchar(50),
	"merchant_name" varchar(255),
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'COMPLETED',
	"transaction_date" timestamp NOT NULL,
	"description" text,
	"category" varchar(100),
	"payment_method" varchar(100),
	"reference_ids" jsonb DEFAULT '{}'::jsonb,
	"location" jsonb,
	"merchant_data" jsonb DEFAULT '{}'::jsonb,
	"extraction_confidence" double precision,
	"schema_used" varchar(100),
	"data_source" varchar(20),
	"is_verified" boolean DEFAULT false,
	"verification_status" varchar(20) DEFAULT 'UNVERIFIED',
	"duplicate_of" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_sync_status" ADD CONSTRAINT "email_sync_status_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parsed_emails" ADD CONSTRAINT "parsed_emails_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_access_logs" ADD CONSTRAINT "token_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_google_tokens" ADD CONSTRAINT "user_google_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_v2" ADD CONSTRAINT "transactions_v2_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_v2" ADD CONSTRAINT "transactions_v2_parsed_email_id_parsed_emails_id_fk" FOREIGN KEY ("parsed_email_id") REFERENCES "public"."parsed_emails"("id") ON DELETE set null ON UPDATE no action;