CREATE TABLE "default_labor_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage" "production_stage" NOT NULL,
	"rate_per_piece" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_labor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"stage" "production_stage" NOT NULL,
	"quantity" integer NOT NULL,
	"labor_rate_per_piece" numeric(14, 2) NOT NULL,
	"total_labor_cost" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_stages" ADD COLUMN "labor_rate_per_piece" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_material_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_electricity_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_labor_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "actual_material_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "actual_electricity_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "actual_labor_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "order_item_labor" ADD CONSTRAINT "order_item_labor_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "default_labor_rates_stage_uq" ON "default_labor_rates" USING btree ("stage");--> statement-breakpoint
CREATE UNIQUE INDEX "order_item_labor_uq" ON "order_item_labor" USING btree ("order_item_id","stage");--> statement-breakpoint
CREATE INDEX "order_item_labor_item_idx" ON "order_item_labor" USING btree ("order_item_id");