CREATE TABLE "message_rating" (
	"message_id" text PRIMARY KEY,
	"world_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"rated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_rating_value" CHECK ("value" in (1, -1))
);
--> statement-breakpoint
ALTER TABLE "message_rating" ADD CONSTRAINT "message_rating_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;