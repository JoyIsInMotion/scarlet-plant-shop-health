-- Drop plant_stats (replaces it with plant_care_logs)
DROP TABLE IF EXISTS "plant_stats";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."metric_type";--> statement-breakpoint

-- Create care_type enum
CREATE TYPE "public"."care_type" AS ENUM('watered', 'fertilized', 'repotted', 'misted', 'pruned', 'rotated', 'observation');--> statement-breakpoint

-- Add structured care interval columns to plant_species
ALTER TABLE "plant_species" ADD COLUMN IF NOT EXISTS "watering_interval_days" integer;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN IF NOT EXISTS "fertilizing_interval_days" integer;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN IF NOT EXISTS "repotting_interval_months" integer;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN IF NOT EXISTS "misting_needed" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Create plant_care_schedules table (one row per plant)
CREATE TABLE IF NOT EXISTS "plant_care_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"watering_interval_days" integer,
	"watering_next_due" timestamp,
	"fertilizing_interval_days" integer,
	"fertilizing_next_due" timestamp,
	"repotting_interval_months" integer,
	"repotting_next_due" timestamp,
	"misting_needed" boolean DEFAULT false NOT NULL,
	"misting_next_due" timestamp,
	"is_customized" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plant_care_schedules_plant_id_unique" UNIQUE("plant_id")
);--> statement-breakpoint

-- Create plant_care_logs table
CREATE TABLE IF NOT EXISTS "plant_care_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"care_type" "care_type" NOT NULL,
	"photo_url" text,
	"notes" text,
	"logged_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Foreign keys
ALTER TABLE "plant_care_schedules" ADD CONSTRAINT "plant_care_schedules_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_care_logs" ADD CONSTRAINT "plant_care_logs_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_care_logs" ADD CONSTRAINT "plant_care_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Composite indexes on plant_care_logs
CREATE INDEX IF NOT EXISTS "care_logs_plant_logged_idx" ON "plant_care_logs" USING btree ("plant_id", "logged_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "care_logs_plant_type_idx" ON "plant_care_logs" USING btree ("plant_id", "care_type");--> statement-breakpoint

-- Composite indexes on existing tables for common query patterns
CREATE INDEX IF NOT EXISTS "plants_user_archived_created_idx" ON "plants" USING btree ("user_id", "is_archived", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_user_created_idx" ON "orders" USING btree ("user_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_analyses_plant_analyzed_idx" ON "ai_analyses" USING btree ("plant_id", "analyzed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_active_category_created_idx" ON "products" USING btree ("is_active", "category", "created_at");
