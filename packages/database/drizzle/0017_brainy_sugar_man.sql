ALTER TABLE "merchant_v2" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "amount" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "currency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "currency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "transaction_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_v2" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "domains" text[];--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "subject_patterns" text[];--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "body_patterns" text[];--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "field_map" jsonb;--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "duplicate_window_minutes" integer;--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "duplicate_fields" text[];--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "template_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "merchant_v2" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD COLUMN "order_id" text;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD COLUMN "provider" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD COLUMN "is_duplicate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD COLUMN "raw_email_id" text;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD CONSTRAINT "transaction_v2_category_id_transaction_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."transaction_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_v2" DROP COLUMN "normalized_name";--> statement-breakpoint
ALTER TABLE "merchant_v2" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "transaction_v2" DROP COLUMN "payment_meta";