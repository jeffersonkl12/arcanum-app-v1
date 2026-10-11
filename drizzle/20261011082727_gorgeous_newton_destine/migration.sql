ALTER TABLE "actor" ADD COLUMN "strength" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "actor" ADD COLUMN "dexterity" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "actor" ADD COLUMN "intelligence" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_attributes_range" CHECK ("strength" between 1 and 20
        and "dexterity" between 1 and 20
        and "intelligence" between 1 and 20);