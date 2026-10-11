ALTER TABLE "actor" ADD COLUMN "gold_pieces" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "actor" ADD COLUMN "silver_pieces" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "actor" ADD COLUMN "bronze_pieces" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "actor" ADD CONSTRAINT "actor_coins_range" CHECK ("gold_pieces" between 0 and 999999999
        and "silver_pieces" between 0 and 999999999
        and "bronze_pieces" between 0 and 999999999);