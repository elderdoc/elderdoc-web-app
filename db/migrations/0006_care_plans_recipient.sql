-- Add recipient_id to care_plans and decouple from job
ALTER TABLE "care_plans" ADD COLUMN "recipient_id" uuid;

-- Backfill from job → care_request → recipient
UPDATE "care_plans" cp
SET recipient_id = cr.recipient_id
FROM "jobs" j
JOIN "care_requests" cr ON j.request_id = cr.id
WHERE cp.job_id = j.id;

-- Drop any orphaned rows where backfill failed
DELETE FROM "care_plans" WHERE recipient_id IS NULL;

-- Apply NOT NULL and foreign key
ALTER TABLE "care_plans" ALTER COLUMN "recipient_id" SET NOT NULL;
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_recipient_id_care_recipients_id_fk"
  FOREIGN KEY ("recipient_id") REFERENCES "care_recipients"("id") ON DELETE CASCADE;

-- One plan per recipient
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_recipient_id_unique" UNIQUE("recipient_id");

-- Remove old job-level unique constraint and make job_id optional
ALTER TABLE "care_plans" DROP CONSTRAINT IF EXISTS "care_plans_job_id_unique";
ALTER TABLE "care_plans" ALTER COLUMN "job_id" DROP NOT NULL;
