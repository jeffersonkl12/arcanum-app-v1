ALTER TABLE "actor" ADD COLUMN "hp_max" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "actor" ADD COLUMN "hp_current" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
-- Players that already exist get the player default, as new ones do (ACTOR_HP.defaultPlayer).
UPDATE "actor" SET "hp_max" = 40, "hp_current" = 40 WHERE "is_npc" = false;--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_hp_max_range" CHECK ("hp_max" between 1 and 9999);--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_hp_current_range" CHECK ("hp_current" between 0 and "hp_max");