CREATE TABLE "merchant_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"logo" text,
	"website" text,
	"default_category_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_id" uuid,
	"instrument_id" uuid,
	"amount" double precision NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"status" varchar(20) DEFAULT 'COMPLETED',
	"transaction_date" timestamp NOT NULL,
	"payment_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD CONSTRAINT "merchant_v2_default_category_id_transaction_categories_id_fk" FOREIGN KEY ("default_category_id") REFERENCES "public"."transaction_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD CONSTRAINT "merchant_v2_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD CONSTRAINT "merchant_v2_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD CONSTRAINT "transaction_v2_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD CONSTRAINT "transaction_v2_merchant_id_merchant_v2_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchant_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD CONSTRAINT "transaction_v2_instrument_id_financial_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."financial_instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint