CREATE TABLE "care_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"daily_schedule" jsonb,
	"medications" jsonb,
	"dietary_restrictions" text[],
	"emergency_contacts" jsonb,
	"special_instructions" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "care_plans_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "care_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"relationship" text,
	"name" text NOT NULL,
	"dob" text,
	"phone" text,
	"gender" text,
	"photo_url" text,
	"address" jsonb,
	"conditions" text[],
	"mobility_level" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_request_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"address1" text,
	"address2" text,
	"city" text,
	"state" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	CONSTRAINT "care_request_locations_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "care_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"recipient_id" uuid,
	"title" text,
	"description" text,
	"care_type" text NOT NULL,
	"frequency" text,
	"days" text[],
	"shifts" text[],
	"start_date" text,
	"duration_hours" integer,
	"gender_pref" text,
	"language_pref" text[],
	"budget_type" text,
	"budget_amount" numeric(10, 2),
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caregiver_care_types" (
	"caregiver_id" uuid NOT NULL,
	"care_type" text NOT NULL,
	CONSTRAINT "caregiver_care_types_caregiver_id_care_type_pk" PRIMARY KEY("caregiver_id","care_type")
);
--> statement-breakpoint
CREATE TABLE "caregiver_certifications" (
	"caregiver_id" uuid NOT NULL,
	"certification" text NOT NULL,
	CONSTRAINT "caregiver_certifications_caregiver_id_certification_pk" PRIMARY KEY("caregiver_id","certification")
);
--> statement-breakpoint
CREATE TABLE "caregiver_languages" (
	"caregiver_id" uuid NOT NULL,
	"language" text NOT NULL,
	CONSTRAINT "caregiver_languages_caregiver_id_language_pk" PRIMARY KEY("caregiver_id","language")
);
--> statement-breakpoint
CREATE TABLE "caregiver_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"address1" text,
	"address2" text,
	"city" text,
	"state" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	CONSTRAINT "caregiver_locations_caregiver_id_unique" UNIQUE("caregiver_id")
);
--> statement-breakpoint
CREATE TABLE "caregiver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"headline" text,
	"about" text,
	"photo_url" text,
	"hourly_min" numeric(10, 2),
	"hourly_max" numeric(10, 2),
	"experience" text,
	"education" text,
	"relocatable" boolean DEFAULT false,
	"status" text DEFAULT 'pending',
	"completed_step" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caregiver_work_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"work_type" text,
	"shift" text,
	"day" text,
	"travel_distance_miles" integer,
	"start_availability" text
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"cover_note" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid,
	"application_id" uuid,
	"request_id" uuid NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"method" text NOT NULL,
	"status" text DEFAULT 'pending',
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"status" text DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"role" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_recipients" ADD CONSTRAINT "care_recipients_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_request_locations" ADD CONSTRAINT "care_request_locations_request_id_care_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."care_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_requests" ADD CONSTRAINT "care_requests_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_requests" ADD CONSTRAINT "care_requests_recipient_id_care_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."care_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_care_types" ADD CONSTRAINT "caregiver_care_types_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_certifications" ADD CONSTRAINT "caregiver_certifications_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_languages" ADD CONSTRAINT "caregiver_languages_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_locations" ADD CONSTRAINT "caregiver_locations_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_profiles" ADD CONSTRAINT "caregiver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_work_prefs" ADD CONSTRAINT "caregiver_work_prefs_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_request_id_care_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."care_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_request_id_care_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."care_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_request_id_care_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."care_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;