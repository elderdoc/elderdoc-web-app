CREATE TABLE IF NOT EXISTS care_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO care_types (key, label) VALUES
  ('personal-care',              'Personal Care'),
  ('companionship',              'Companionship'),
  ('dementia-care',              'Dementia Care'),
  ('mobility-assistance',        'Mobility Assistance'),
  ('post-hospital-recovery',     'Post-Hospital Recovery'),
  ('meal-and-nutrition',         'Meal and Nutrition'),
  ('house-chores',               'House Chores'),
  ('activities-of-daily-living', 'Activities of Daily Living'),
  ('transportation',             'Transportation')
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'caregiver_care_types_care_type_care_types_key_fk'
  ) THEN
    ALTER TABLE caregiver_care_types
      ADD CONSTRAINT caregiver_care_types_care_type_care_types_key_fk
      FOREIGN KEY (care_type) REFERENCES care_types(key)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'care_requests_care_type_care_types_key_fk'
  ) THEN
    ALTER TABLE care_requests
      ADD CONSTRAINT care_requests_care_type_care_types_key_fk
      FOREIGN KEY (care_type) REFERENCES care_types(key)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
