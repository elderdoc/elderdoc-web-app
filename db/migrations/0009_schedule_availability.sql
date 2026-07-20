ALTER TABLE care_requests
  ADD COLUMN IF NOT EXISTS schedule jsonb,
  DROP COLUMN IF EXISTS days,
  DROP COLUMN IF EXISTS shifts,
  DROP COLUMN IF EXISTS duration_hours;

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS availability jsonb;

ALTER TABLE caregiver_work_prefs
  DROP COLUMN IF EXISTS shift,
  DROP COLUMN IF EXISTS day;
