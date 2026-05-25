CREATE TYPE "public"."ai_condition" AS ENUM('excellent', 'good', 'fair', 'poor', 'critical');--> statement-breakpoint
CREATE TYPE "public"."ai_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."care_difficulty" AS ENUM('easy', 'moderate', 'difficult');--> statement-breakpoint
CREATE TYPE "public"."metric_type" AS ENUM('water', 'light', 'humidity', 'temperature', 'fertilizer');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('bouquet', 'potted_plant', 'succulent', 'tropical', 'seasonal', 'accessories');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid,
	"user_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"health_score" real,
	"overall_condition" "ai_condition",
	"issues" jsonb DEFAULT '[]'::jsonb,
	"care_recommendations" jsonb DEFAULT '[]'::jsonb,
	"watering_needed" boolean,
	"identified_common_name" varchar(150),
	"identified_scientific_name" varchar(200),
	"identified_family" varchar(150),
	"identified_native_region" varchar(200),
	"identified_care_difficulty" "care_difficulty",
	"matched_species_id" uuid,
	"confidence" "ai_confidence",
	"model_used" varchar(60) NOT NULL,
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"shipping_address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_species" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"common_name_bg" varchar(150),
	"common_name_en" varchar(150),
	"scientific_name" varchar(200) NOT NULL,
	"family" varchar(150),
	"native_region_bg" text,
	"native_region_en" text,
	"care_difficulty" "care_difficulty",
	"description_bg" text,
	"description_en" text,
	"care_guide" jsonb,
	"image_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"metric_type" "metric_type" NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(20),
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"species_id" uuid,
	"custom_name" varchar(100) NOT NULL,
	"health_score" real DEFAULT 100 NOT NULL,
	"last_watered" timestamp,
	"image_url" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"species_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_bg" varchar(200) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"description_bg" text,
	"description_en" text,
	"price" numeric(10, 2) NOT NULL,
	"category" "product_category" NOT NULL,
	"image_url" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"slug" varchar(250) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"preferred_locale" varchar(5) DEFAULT 'bg' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_matched_species_id_plant_species_id_fk" FOREIGN KEY ("matched_species_id") REFERENCES "public"."plant_species"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_stats" ADD CONSTRAINT "plant_stats_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_species_id_plant_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."plant_species"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_analyses_plant_idx" ON "ai_analyses" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "ai_analyses_user_idx" ON "ai_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_analyses_analyzed_at_idx" ON "ai_analyses" USING btree ("analyzed_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "plant_species_scientific_idx" ON "plant_species" USING btree ("scientific_name");--> statement-breakpoint
CREATE INDEX "plant_species_common_bg_idx" ON "plant_species" USING btree ("common_name_bg");--> statement-breakpoint
CREATE INDEX "plant_species_common_en_idx" ON "plant_species" USING btree ("common_name_en");--> statement-breakpoint
CREATE INDEX "plant_species_verified_idx" ON "plant_species" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "plant_stats_plant_idx" ON "plant_stats" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "plant_stats_metric_idx" ON "plant_stats" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "plant_stats_recorded_at_idx" ON "plant_stats" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "plants_user_idx" ON "plants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plants_species_idx" ON "plants" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "plants_health_idx" ON "plants" USING btree ("health_score");--> statement-breakpoint
CREATE INDEX "plants_archived_idx" ON "plants" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");