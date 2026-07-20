ALTER TABLE "care_requests" DROP CONSTRAINT "care_requests_recipient_id_care_recipients_id_fk";
--> statement-breakpoint
ALTER TABLE "care_requests" ADD CONSTRAINT "care_requests_recipient_id_care_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."care_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_check" CHECK (("jobs"."match_id" IS NOT NULL)::int + ("jobs"."application_id" IS NOT NULL)::int = 1);