CREATE TABLE "app_knowledge" (
	"id" integer PRIMARY KEY NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"how_it_works" text DEFAULT '' NOT NULL,
	"pricing_and_billing" text DEFAULT '' NOT NULL,
	"for_caregivers" text DEFAULT '' NOT NULL,
	"for_clients" text DEFAULT '' NOT NULL,
	"faqs" text DEFAULT '' NOT NULL,
	"support" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
INSERT INTO "app_knowledge" ("id") VALUES (1) ON CONFLICT DO NOTHING;
