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
ALTER TABLE "transactions_v2" ADD CONSTRAINT "transactions_v2_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_v2" ADD CONSTRAINT "transactions_v2_parsed_email_id_parsed_emails_id_fk" FOREIGN KEY ("parsed_email_id") REFERENCES "public"."parsed_emails"("id") ON DELETE set null ON UPDATE no action;