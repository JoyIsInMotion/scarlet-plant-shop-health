-- Community feed (public plants + likes) and species pet-toxicity flag.
-- Idempotent (IF EXISTS / IF NOT EXISTS) so db:migrate is safe to re-run.

-- plants: public sharing + cached like count
ALTER TABLE "plants" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "plants" ADD COLUMN IF NOT EXISTS "likes_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plants_public_idx" ON "plants" USING btree ("is_public");--> statement-breakpoint

-- plant_species: pet toxicity flag (nullable = unknown)
ALTER TABLE "plant_species" ADD COLUMN IF NOT EXISTS "is_toxic_to_pets" boolean;--> statement-breakpoint

-- plant_likes: one row per user per plant
CREATE TABLE IF NOT EXISTS "plant_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "plant_likes" ADD CONSTRAINT "plant_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_likes" ADD CONSTRAINT "plant_likes_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plant_likes_user_idx" ON "plant_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plant_likes_plant_idx" ON "plant_likes" USING btree ("plant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plant_likes_user_plant_idx" ON "plant_likes" USING btree ("user_id", "plant_id");--> statement-breakpoint

-- ai_analyses: drop legacy free-text advice columns (replaced by structured recommendations)
ALTER TABLE "ai_analyses" DROP COLUMN IF EXISTS "advice_en";--> statement-breakpoint
ALTER TABLE "ai_analyses" DROP COLUMN IF EXISTS "advice_bg";
