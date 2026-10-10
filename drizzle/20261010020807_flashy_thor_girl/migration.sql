CREATE TYPE "actor_age" AS ENUM('baby', 'child', 'adolescent', 'young_adult', 'middle_aged', 'old', 'elder');--> statement-breakpoint
CREATE TYPE "actor_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "world_genre" AS ENUM('fantasy', 'high_fantasy', 'dark_fantasy', 'grimdark', 'medieval', 'mythological', 'steampunk', 'cyberpunk', 'sci_fi', 'post_apocalyptic', 'horror', 'western');--> statement-breakpoint
CREATE TABLE "actor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"age" "actor_age" NOT NULL,
	"gender" "actor_gender" NOT NULL,
	"culture_id" uuid,
	"language_id" uuid,
	"profession" text,
	"appearance" text,
	"personality" text,
	"background" text,
	"is_npc" boolean DEFAULT true NOT NULL,
	"party_id" uuid
);
--> statement-breakpoint
CREATE TABLE "culture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "culture_id_world_id_unique" UNIQUE("id","world_id")
);
--> statement-breakpoint
CREATE TABLE "language" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "language_id_world_id_unique" UNIQUE("id","world_id")
);
--> statement-breakpoint
CREATE TABLE "party" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL CONSTRAINT "party_world_id_unique" UNIQUE,
	CONSTRAINT "party_id_world_id_unique" UNIQUE("id","world_id")
);
--> statement-breakpoint
CREATE TABLE "world" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"genre" "world_genre" NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "actor_world_id_player_unique" ON "actor" ("world_id") WHERE "is_npc" = false;--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_culture_world_fk" FOREIGN KEY ("culture_id","world_id") REFERENCES "culture"("id","world_id");--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_language_world_fk" FOREIGN KEY ("language_id","world_id") REFERENCES "language"("id","world_id");--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_party_world_fk" FOREIGN KEY ("party_id","world_id") REFERENCES "party"("id","world_id");--> statement-breakpoint
ALTER TABLE "culture" ADD CONSTRAINT "culture_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "language" ADD CONSTRAINT "language_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "party" ADD CONSTRAINT "party_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;