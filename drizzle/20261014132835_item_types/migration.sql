-- Items made before the item types are brought to the new rules before the CHECKs tighten.
-- The type comes from what the item was: a weapon, a piece of clothing, a consumable, else a tool
-- (an item that was both a weapon and a consumable stays a weapon). The armor bonus becomes the
-- clothing class (0-1 light, 2 medium, 3 heavy); the damage die and the bonus are dropped.
-- A tiny item (0 slots) takes 1 slot now, and the single piece of clothing worn is the one that was
-- on the torso (the one on the head, if any, goes back to the inventory).
CREATE TYPE "clothing_class" AS ENUM('light', 'medium', 'heavy');--> statement-breakpoint
CREATE TYPE "item_type" AS ENUM('weapon', 'clothing', 'tool', 'consumable');--> statement-breakpoint
ALTER TABLE "item" DROP CONSTRAINT "item_tiny_slots";--> statement-breakpoint
ALTER TABLE "item" DROP CONSTRAINT "item_wear_fields";--> statement-breakpoint
ALTER TABLE "item" DROP CONSTRAINT "item_armor_bonus_range";--> statement-breakpoint
ALTER TABLE "item" DROP CONSTRAINT "item_not_weapon_and_wearable";--> statement-breakpoint
ALTER TABLE "item" DROP CONSTRAINT "item_weapon_fields";--> statement-breakpoint
ALTER TABLE "item" DROP CONSTRAINT "item_equipped_slot_matches";--> statement-breakpoint
ALTER TABLE "item" DROP CONSTRAINT "item_slots_range";--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "type" "item_type";--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "clothing_class" "clothing_class";--> statement-breakpoint
UPDATE "item" SET
  "type" = CASE
    WHEN "weapon_class" IS NOT NULL THEN 'weapon'::"item_type"
    WHEN "wear_slot" IS NOT NULL THEN 'clothing'::"item_type"
    WHEN "is_consumable" THEN 'consumable'::"item_type"
    ELSE 'tool'::"item_type"
  END,
  "clothing_class" = CASE
    WHEN "wear_slot" IS NULL THEN NULL
    WHEN "armor_bonus" >= 3 THEN 'heavy'::"clothing_class"
    WHEN "armor_bonus" = 2 THEN 'medium'::"clothing_class"
    ELSE 'light'::"clothing_class"
  END,
  "slots" = LEAST(GREATEST("slots", 1), 18);--> statement-breakpoint
ALTER TABLE "item" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
UPDATE "item" AS "head" SET "equipped_slot" = NULL
  WHERE "head"."equipped_slot" = 'head'
    AND EXISTS (
      SELECT 1 FROM "item" AS "torso"
      WHERE "torso"."actor_id" = "head"."actor_id" AND "torso"."equipped_slot" = 'torso'
    );--> statement-breakpoint
ALTER TABLE "item" ALTER COLUMN "equipped_slot" SET DATA TYPE text;--> statement-breakpoint
UPDATE "item" SET "equipped_slot" = 'body' WHERE "equipped_slot" IN ('torso', 'head');--> statement-breakpoint
DROP TYPE "equipment_slot";--> statement-breakpoint
CREATE TYPE "equipment_slot" AS ENUM('main_hand', 'off_hand', 'body');--> statement-breakpoint
ALTER TABLE "item" ALTER COLUMN "equipped_slot" SET DATA TYPE "equipment_slot" USING "equipped_slot"::"equipment_slot";--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "is_tiny";--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "is_consumable";--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "damage_die";--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "wear_slot";--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "armor_bonus";--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_slots_range" CHECK ("slots" between 1 and 18);--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_weapon_fields" CHECK (("type" = 'weapon') = ("weapon_class" is not null));--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_clothing_fields" CHECK (("type" = 'clothing') = ("clothing_class" is not null));--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_equipped_slot_matches" CHECK ("equipped_slot" is null
        or ("equipped_slot" in ('main_hand', 'off_hand') and "type" = 'weapon')
        or ("equipped_slot" = 'body' and "type" = 'clothing'));--> statement-breakpoint
DROP TYPE "weapon_die";--> statement-breakpoint
DROP TYPE "wear_slot";
