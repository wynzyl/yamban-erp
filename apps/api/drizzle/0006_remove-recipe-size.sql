DROP INDEX "product_recipes_uq";--> statement-breakpoint
ALTER TABLE "product_recipes" DROP COLUMN "size";--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_productId_unique" UNIQUE("product_id");