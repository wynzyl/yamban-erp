DROP INDEX "product_size_processes_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "product_size_processes_uq" ON "product_size_processes" USING btree ("product_id","machine_id");--> statement-breakpoint
ALTER TABLE "product_size_processes" DROP COLUMN "size";