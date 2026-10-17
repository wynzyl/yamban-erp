CREATE TABLE "overhead_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monthly_amount" numeric(14, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "overhead_settings_amount_nonneg" CHECK ("overhead_settings"."monthly_amount" >= 0)
);
