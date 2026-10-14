-- Actors made before the dice-pool rules are brought into the new ranges before the CHECKs tighten.
-- Health is clamped. An attribute from the old scale (out of 1-6) goes back to the default.
UPDATE "actor" SET
  "hp_max" = LEAST(GREATEST("hp_max", 2), 12),
  "hp_current" = LEAST("hp_current", LEAST(GREATEST("hp_max", 2), 12));--> statement-breakpoint
UPDATE "actor" SET
  "strength" = CASE WHEN "strength" BETWEEN 1 AND 6 THEN "strength" ELSE 4 END,
  "dexterity" = CASE WHEN "dexterity" BETWEEN 1 AND 6 THEN "dexterity" ELSE 4 END,
  "intelligence" = CASE WHEN "intelligence" BETWEEN 1 AND 6 THEN "intelligence" ELSE 4 END;--> statement-breakpoint
ALTER TABLE "actor" ALTER COLUMN "hp_max" SET DEFAULT 7;--> statement-breakpoint
ALTER TABLE "actor" ALTER COLUMN "hp_current" SET DEFAULT 7;--> statement-breakpoint
ALTER TABLE "actor" ALTER COLUMN "strength" SET DEFAULT 4;--> statement-breakpoint
ALTER TABLE "actor" ALTER COLUMN "dexterity" SET DEFAULT 4;--> statement-breakpoint
ALTER TABLE "actor" ALTER COLUMN "intelligence" SET DEFAULT 4;--> statement-breakpoint
ALTER TABLE "actor" DROP CONSTRAINT "actor_hp_max_range", ADD CONSTRAINT "actor_hp_max_range" CHECK ("hp_max" between 2 and 12);--> statement-breakpoint
ALTER TABLE "actor" DROP CONSTRAINT "actor_attributes_range", ADD CONSTRAINT "actor_attributes_range" CHECK ("strength" between 1 and 6
        and "dexterity" between 1 and 6
        and "intelligence" between 1 and 6);