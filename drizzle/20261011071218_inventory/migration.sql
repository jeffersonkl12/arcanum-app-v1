CREATE TYPE "equipment_slot" AS ENUM('main_hand', 'off_hand', 'torso', 'head');--> statement-breakpoint
CREATE TYPE "weapon_class" AS ENUM('light', 'heavy', 'ranged');--> statement-breakpoint
CREATE TYPE "weapon_die" AS ENUM('d4', 'd6', 'd8', 'd12');--> statement-breakpoint
CREATE TYPE "wear_slot" AS ENUM('torso', 'head');--> statement-breakpoint
CREATE TABLE "item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"actor_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"image_path" text,
	"is_tiny" boolean DEFAULT false NOT NULL,
	"slots" integer DEFAULT 1 NOT NULL,
	"is_consumable" boolean DEFAULT false NOT NULL,
	"weapon_class" "weapon_class",
	"damage_die" "weapon_die",
	"wear_slot" "wear_slot",
	"armor_bonus" integer,
	"equipped_slot" "equipment_slot",
	CONSTRAINT "item_equipped_needs_actor" CHECK ("equipped_slot" is null or "actor_id" is not null),
	CONSTRAINT "item_slots_range" CHECK ("slots" between 0 and 99),
	CONSTRAINT "item_tiny_slots" CHECK (("is_tiny" and "slots" = 0) or (not "is_tiny" and "slots" >= 1)),
	CONSTRAINT "item_weapon_fields" CHECK (("weapon_class" is null) = ("damage_die" is null)),
	CONSTRAINT "item_wear_fields" CHECK (("wear_slot" is null) = ("armor_bonus" is null)),
	CONSTRAINT "item_armor_bonus_range" CHECK ("armor_bonus" is null or "armor_bonus" between 0 and 3),
	CONSTRAINT "item_not_weapon_and_wearable" CHECK ("weapon_class" is null or "wear_slot" is null),
	CONSTRAINT "item_equipped_slot_matches" CHECK ("equipped_slot" is null
        or ("equipped_slot" in ('main_hand', 'off_hand') and "weapon_class" is not null)
        or ("wear_slot" is not null and "equipped_slot"::text = "wear_slot"::text))
);
--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_id_world_id_unique" UNIQUE("id","world_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_actor_id_equipped_slot_unique" ON "item" ("actor_id","equipped_slot") WHERE "equipped_slot" is not null;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_actor_world_fk" FOREIGN KEY ("actor_id","world_id") REFERENCES "actor"("id","world_id");