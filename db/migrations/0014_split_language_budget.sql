ALTER TABLE care_requests
  DROP COLUMN IF EXISTS language_pref,
  ADD COLUMN languages_preferred text[] NOT NULL DEFAULT '{}',
  ADD COLUMN languages_required text[] NOT NULL DEFAULT '{}',
  DROP COLUMN IF EXISTS budget_amount,
  ADD COLUMN budget_min numeric(10, 2),
  ADD COLUMN budget_max numeric(10, 2);
