ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "about" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notify_email" boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notify_sms" boolean NOT NULL DEFAULT false;
