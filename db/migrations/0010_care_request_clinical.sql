ALTER TABLE care_requests
  ADD COLUMN IF NOT EXISTS supplies_needed text,
  ADD COLUMN IF NOT EXISTS infection_control jsonb,
  ADD COLUMN IF NOT EXISTS safety_measures jsonb,
  ADD COLUMN IF NOT EXISTS client_status jsonb;
