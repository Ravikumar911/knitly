CREATE TABLE "ai_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parsed_email_id" uuid,
	"detected_provider" varchar(255),
	"email_type" varchar(50),
	"email_subject" text,
	"transaction_data" jsonb,
	"parse_success" boolean NOT NULL,
	"parse_errors" text[],
	"confidence_score" double precision,
	"data_source" varchar(20),
	"verification_status" varchar(20) DEFAULT 'UNVERIFIED',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_id_transaction_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "ai_analysis_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" varchar(20) DEFAULT 'COMPLETED';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_name" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_category" varchar(50);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reference_ids" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "order_id" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "order_items" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "verification_status" varchar(20) DEFAULT 'UNVERIFIED';--> statement-breakpoint
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_parsed_email_id_parsed_emails_id_fk" FOREIGN KEY ("parsed_email_id") REFERENCES "public"."parsed_emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ai_analysis_id_ai_analysis_id_fk" FOREIGN KEY ("ai_analysis_id") REFERENCES "public"."ai_analysis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "upi_reference_id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "upi_transaction_id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "counterparty_upi_handle";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "is_recurring";