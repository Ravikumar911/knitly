
--> statement-breakpoint

ALTER TABLE "parsed_emails" ADD COLUMN "ai_analysis_id" uuid;--> statement-breakpoint
ALTER TABLE "parsed_emails" ADD CONSTRAINT "parsed_emails_ai_analysis_id_ai_analysis_id_fk" FOREIGN KEY ("ai_analysis_id") REFERENCES "public"."ai_analysis"("id") ON DELETE cascade ON UPDATE no action;