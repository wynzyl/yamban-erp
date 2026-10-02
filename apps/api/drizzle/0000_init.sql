CREATE TYPE "public"."design_approval_status" AS ENUM('DRAFTING', 'FOR_APPROVAL', 'REVISION_REQUESTED', 'APPROVED');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('SALARY', 'GOVT_CONTRIBUTIONS', 'RENT', 'UTILITIES', 'FUEL', 'VEHICLE_MAINTENANCE', 'REPAIR_MAINTENANCE', 'PROFESSIONAL_FEES', 'MEALS_SNACKS', 'OFFICE_SUPPLIES', 'SHIPPING', 'LOAN_PAYMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."garment_size" AS ENUM('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'ONE_SIZE');--> statement-breakpoint
CREATE TYPE "public"."inventory_txn_type" AS ENUM('PURCHASE', 'ORDER_CONSUMPTION', 'RETURN', 'ADJUSTMENT', 'WASTE');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."material_status" AS ENUM('COMPLETE', 'SHORT');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('QUOTATION', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'RELEASED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'GCASH', 'BANK_TRANSFER', 'CHECK');--> statement-breakpoint
CREATE TYPE "public"."production_stage" AS ENUM('DESIGN', 'PRINTING', 'HEAT_PRESS', 'SEWING', 'PACKAGING');--> statement-breakpoint
CREATE TYPE "public"."purchase_request_status" AS ENUM('DRAFT', 'PRINTED', 'ORDERED', 'RECEIVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."stock_unit" AS ENUM('YARD', 'METER', 'ML', 'GRAM', 'PIECE');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'STAFF', 'DESIGNER');--> statement-breakpoint
CREATE TYPE "public"."session_revoke_reason" AS ENUM('ROTATED', 'LOGOUT', 'REUSE');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" "session_revoke_reason",
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'STAFF' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"organization_id" uuid,
	"mobile" text,
	"email" text,
	"facebook" text,
	"birthday" date,
	"street_purok" text,
	"barangay" text,
	"municipality" text,
	"province" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "electricity_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rate_per_kwh" numeric(14, 4) NOT NULL,
	"effective_date" date NOT NULL,
	CONSTRAINT "electricity_rates_effectiveDate_unique" UNIQUE("effective_date")
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"stage" "production_stage" NOT NULL,
	"power_kw" numeric(8, 3) NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"category" text NOT NULL,
	"unit" "stock_unit" NOT NULL,
	"purchase_unit" text NOT NULL,
	"purchase_quantity" numeric(14, 3) NOT NULL,
	"default_supplier_id" uuid,
	"reorder_level" numeric(14, 3) DEFAULT '0' NOT NULL,
	"stock_on_hand" numeric(14, 3) DEFAULT '0' NOT NULL,
	"average_unit_cost" numeric(14, 4) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"size" "garment_size" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_size_processes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"size" "garment_size" NOT NULL,
	"machine_id" uuid NOT NULL,
	"minutes_per_piece" numeric(8, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"size" "garment_size" NOT NULL,
	"default_price" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"stage" "production_stage" NOT NULL,
	"sequence" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity_per_piece" numeric(14, 3) NOT NULL,
	"stage" "production_stage" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"mobile" text,
	"email" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_processes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"size" "garment_size" NOT NULL,
	"machine_id" uuid NOT NULL,
	"power_kw" numeric(8, 3) NOT NULL,
	"minutes_per_piece" numeric(8, 2) NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"size" "garment_size" NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	CONSTRAINT "order_item_sizes_qty_pos" CHECK ("order_item_sizes"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"size" "garment_size" NOT NULL,
	"quantity_per_piece" numeric(14, 3) NOT NULL,
	"total_quantity" numeric(14, 3) NOT NULL,
	"unit" "stock_unit" NOT NULL,
	"unit_cost" numeric(14, 4) NOT NULL,
	"total_cost" numeric(14, 2) NOT NULL,
	"stage" "production_stage" NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"player_name" text NOT NULL,
	"jersey_number" text,
	"size" "garment_size" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"organization_id" uuid,
	"parent_order_id" uuid,
	"order_date" date DEFAULT now() NOT NULL,
	"due_date" date,
	"status" "order_status" DEFAULT 'QUOTATION' NOT NULL,
	"material_status" "material_status" DEFAULT 'COMPLETE' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"electricity_rate_per_kwh" numeric(14, 4),
	"confirmed_at" timestamp with time zone,
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_discount_nonneg" CHECK ("orders"."discount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_date" date DEFAULT now() NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"notes" text,
	"recorded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_pos" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "design_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"design_job_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_type" text NOT NULL,
	"version" integer NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"production_job_id" uuid NOT NULL,
	"approval_status" "design_approval_status" DEFAULT 'DRAFTING' NOT NULL,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"requirements" text,
	"reference_notes" text,
	"customer_approved_at" timestamp with time zone,
	"approved_by_id" uuid,
	"reused_from_design_job_id" uuid,
	CONSTRAINT "design_jobs_productionJobId_unique" UNIQUE("production_job_id")
);
--> statement-breakpoint
CREATE TABLE "production_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"stage" "production_stage" NOT NULL,
	"sequence" integer NOT NULL,
	"status" "job_status" DEFAULT 'PENDING' NOT NULL,
	"planned_quantity" integer NOT NULL,
	"completed_quantity" integer DEFAULT 0 NOT NULL,
	"assigned_to_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"actual_fabric_used" numeric(14, 3),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"type" "inventory_txn_type" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(14, 4) NOT NULL,
	"supplier_id" uuid,
	"order_id" uuid,
	"purchase_request_id" uuid,
	"reference" text,
	"transaction_date" date DEFAULT now() NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_request_line_orders" (
	"purchase_request_line_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	CONSTRAINT "purchase_request_line_orders_purchase_request_line_id_order_id_pk" PRIMARY KEY("purchase_request_line_id","order_id")
);
--> statement-breakpoint
CREATE TABLE "purchase_request_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_request_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"shortage_quantity" numeric(14, 3) NOT NULL,
	"purchase_quantity" numeric(14, 3) NOT NULL,
	"estimated_unit_cost" numeric(14, 4) NOT NULL,
	"estimated_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_number" text NOT NULL,
	"supplier_id" uuid,
	"status" "purchase_request_status" DEFAULT 'DRAFT' NOT NULL,
	"needed_by" date,
	"notes" text,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_date" date NOT NULL,
	"category" "expense_category" NOT NULL,
	"supplier_id" uuid,
	"amount" numeric(14, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"description" text NOT NULL,
	"order_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_pos" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_default_supplier_id_suppliers_id_fk" FOREIGN KEY ("default_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_size_processes" ADD CONSTRAINT "product_size_processes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_size_processes" ADD CONSTRAINT "product_size_processes_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stages" ADD CONSTRAINT "product_stages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_materials" ADD CONSTRAINT "recipe_materials_recipe_id_product_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."product_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_materials" ADD CONSTRAINT "recipe_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_processes" ADD CONSTRAINT "order_item_processes_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_processes" ADD CONSTRAINT "order_item_processes_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_sizes" ADD CONSTRAINT "order_item_sizes_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_materials" ADD CONSTRAINT "order_materials_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_materials" ADD CONSTRAINT "order_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_roster" ADD CONSTRAINT "order_roster_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_parent_order_id_orders_id_fk" FOREIGN KEY ("parent_order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_files" ADD CONSTRAINT "design_files_design_job_id_design_jobs_id_fk" FOREIGN KEY ("design_job_id") REFERENCES "public"."design_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_jobs" ADD CONSTRAINT "design_jobs_production_job_id_production_jobs_id_fk" FOREIGN KEY ("production_job_id") REFERENCES "public"."production_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_jobs" ADD CONSTRAINT "design_jobs_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_jobs" ADD CONSTRAINT "design_jobs_reused_from_design_job_id_design_jobs_id_fk" FOREIGN KEY ("reused_from_design_job_id") REFERENCES "public"."design_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_line_orders" ADD CONSTRAINT "purchase_request_line_orders_purchase_request_line_id_purchase_request_lines_id_fk" FOREIGN KEY ("purchase_request_line_id") REFERENCES "public"."purchase_request_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_line_orders" ADD CONSTRAINT "purchase_request_line_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_family_idx" ON "sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "customers_org_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "materials_supplier_idx" ON "materials" USING btree ("default_supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_recipes_uq" ON "product_recipes" USING btree ("product_id","size");--> statement-breakpoint
CREATE UNIQUE INDEX "product_size_processes_uq" ON "product_size_processes" USING btree ("product_id","size","machine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_sizes_uq" ON "product_sizes" USING btree ("product_id","size");--> statement-breakpoint
CREATE UNIQUE INDEX "product_stages_uq" ON "product_stages" USING btree ("product_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_materials_uq" ON "recipe_materials" USING btree ("recipe_id","material_id");--> statement-breakpoint
CREATE INDEX "order_item_processes_item_idx" ON "order_item_processes" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_item_sizes_uq" ON "order_item_sizes" USING btree ("order_item_id","size");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_materials_item_idx" ON "order_materials" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_materials_open_idx" ON "order_materials" USING btree ("material_id") WHERE "order_materials"."consumed_at" is null;--> statement-breakpoint
CREATE INDEX "order_roster_item_idx" ON "order_roster" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_uq" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_status_due_idx" ON "orders" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "design_files_version_uq" ON "design_files" USING btree ("design_job_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "production_jobs_item_stage_uq" ON "production_jobs" USING btree ("order_item_id","stage");--> statement-breakpoint
CREATE INDEX "production_jobs_board_idx" ON "production_jobs" USING btree ("stage","status");--> statement-breakpoint
CREATE INDEX "inventory_txn_material_idx" ON "inventory_transactions" USING btree ("material_id","transaction_date");--> statement-breakpoint
CREATE INDEX "inventory_txn_order_idx" ON "inventory_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_request_lines_uq" ON "purchase_request_lines" USING btree ("purchase_request_id","material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_requests_number_uq" ON "purchase_requests" USING btree ("pr_number");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_requests_one_draft_uq" ON "purchase_requests" USING btree ("supplier_id") WHERE "purchase_requests"."status" = 'DRAFT';--> statement-breakpoint
CREATE INDEX "expenses_month_idx" ON "expenses" USING btree ("expense_date","category");