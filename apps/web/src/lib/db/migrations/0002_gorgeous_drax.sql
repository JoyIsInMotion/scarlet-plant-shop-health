ALTER TABLE "plant_species" ADD COLUMN "category" varchar(30);--> statement-breakpoint
CREATE INDEX "plant_species_category_idx" ON "plant_species" USING btree ("category");