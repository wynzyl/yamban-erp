CREATE TABLE "material_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_categories_name_unique" UNIQUE("name")
);--> statement-breakpoint
INSERT INTO "material_categories" ("name") VALUES
  ('FABRIC'),
  ('INK'),
  ('PAPER'),
  ('THREAD'),
  ('TRIM'),
  ('PACKAGING');
