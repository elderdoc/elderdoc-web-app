CREATE TABLE "caregiver_favorites" (
	"client_id" uuid NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "caregiver_favorites_client_id_caregiver_id_pk" PRIMARY KEY("client_id","caregiver_id")
);
--> statement-breakpoint
CREATE TABLE "client_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"address1" text,
	"address2" text,
	"city" text,
	"state" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	CONSTRAINT "client_locations_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"payment_id" uuid,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "care_plans" DROP CONSTRAINT "care_plans_job_id_unique";--> statement-breakpoint
ALTER TABLE "care_plans" DROP CONSTRAINT "care_plans_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "care_plans" ALTER COLUMN "job_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" SET DEFAULT 'stripe';--> statement-breakpoint
ALTER TABLE "care_plans" ADD COLUMN "recipient_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "caregiver_profiles" ADD COLUMN "rating" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "caregiver_profiles" ADD COLUMN "stripe_connect_account_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "fee" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_invoice_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "released_at" timestamp;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "billed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "caregiver_favorites" ADD CONSTRAINT "caregiver_favorites_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_favorites" ADD CONSTRAINT "caregiver_favorites_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_locations" ADD CONSTRAINT "client_locations_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_recipient_id_care_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."care_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_recipient_id_unique" UNIQUE("recipient_id");