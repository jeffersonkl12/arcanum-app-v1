CREATE TABLE "point_of_interest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_path" text,
	CONSTRAINT "point_of_interest_id_world_id_unique" UNIQUE("id","world_id"),
	CONSTRAINT "point_of_interest_not_own_parent" CHECK ("parent_id" <> "id")
);
--> statement-breakpoint
ALTER TABLE "point_of_interest" ADD CONSTRAINT "point_of_interest_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "point_of_interest" ADD CONSTRAINT "point_of_interest_parent_world_fk" FOREIGN KEY ("parent_id","world_id") REFERENCES "point_of_interest"("id","world_id");