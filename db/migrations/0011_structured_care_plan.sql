ALTER TABLE care_plans
  DROP COLUMN IF EXISTS daily_schedule,
  DROP COLUMN IF EXISTS medications,
  DROP COLUMN IF EXISTS dietary_restrictions,
  DROP COLUMN IF EXISTS emergency_contacts,
  DROP COLUMN IF EXISTS special_instructions,
  DROP COLUMN IF EXISTS job_id,
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES care_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES care_recipients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activity_mobility_safety jsonb,
  ADD COLUMN IF NOT EXISTS hygiene_elimination jsonb,
  ADD COLUMN IF NOT EXISTS home_management jsonb,
  ADD COLUMN IF NOT EXISTS hydration_nutrition jsonb,
  ADD COLUMN IF NOT EXISTS medication_reminders jsonb;

ALTER TABLE care_plans
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE care_plans
  ADD CONSTRAINT care_plans_request_id_unique UNIQUE (request_id);
