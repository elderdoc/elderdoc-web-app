ALTER TABLE "care_types" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "care_types" ADD COLUMN IF NOT EXISTS "icon" text;--> statement-breakpoint
UPDATE "care_types" SET description = 'Bathing, dressing, grooming, and daily hygiene', icon = 'Heart'         WHERE key = 'personal-care'              AND description IS NULL;
UPDATE "care_types" SET description = 'Social visits, errands, and emotional support',     icon = 'Users'         WHERE key = 'companionship'              AND description IS NULL;
UPDATE "care_types" SET description = 'Specialized memory care and cognitive support',     icon = 'Brain'         WHERE key = 'dementia-care'              AND description IS NULL;
UPDATE "care_types" SET description = 'Safe movement, transfers, and fall prevention',     icon = 'Activity'      WHERE key = 'mobility-assistance'        AND description IS NULL;
UPDATE "care_types" SET description = 'Recovery support after surgery or hospitalisation', icon = 'Stethoscope'   WHERE key = 'post-hospital-recovery'     AND description IS NULL;
UPDATE "care_types" SET description = 'Meal planning, preparation, and feeding assistance',icon = 'Utensils'      WHERE key = 'meal-and-nutrition'         AND description IS NULL;
UPDATE "care_types" SET description = 'Light housekeeping, laundry, and tidying',          icon = 'Home'          WHERE key = 'house-chores'               AND description IS NULL;
UPDATE "care_types" SET description = 'ADLs: bathing, dressing, toileting, mobility',      icon = 'ClipboardList' WHERE key = 'activities-of-daily-living' AND description IS NULL;
UPDATE "care_types" SET description = 'Driving to appointments, errands, and outings',     icon = 'Car'           WHERE key = 'transportation'             AND description IS NULL;
