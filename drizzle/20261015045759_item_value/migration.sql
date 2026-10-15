ALTER TABLE "item" ADD COLUMN "gold_pieces" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "silver_pieces" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "bronze_pieces" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_value_range" CHECK ("gold_pieces" between 0 and 999999999
        and "silver_pieces" between 0 and 999999999
        and "bronze_pieces" between 0 and 999999999);