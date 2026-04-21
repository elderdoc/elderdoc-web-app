ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS care_capabilities jsonb,
  ADD COLUMN IF NOT EXISTS special_needs_handling jsonb,
  ADD COLUMN IF NOT EXISTS max_carry_lbs integer;
