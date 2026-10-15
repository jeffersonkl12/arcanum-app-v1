CREATE TYPE "kinship_kind" AS ENUM('parent', 'spouse');--> statement-breakpoint
CREATE TABLE "kinship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"kind" "kinship_kind" NOT NULL,
	"from_actor_id" uuid NOT NULL,
	"to_actor_id" uuid NOT NULL,
	CONSTRAINT "kinship_from_to_unique" UNIQUE("from_actor_id","to_actor_id"),
	CONSTRAINT "kinship_not_self" CHECK ("from_actor_id" <> "to_actor_id")
);
--> statement-breakpoint
ALTER TABLE "kinship" ADD CONSTRAINT "kinship_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kinship" ADD CONSTRAINT "kinship_from_actor_world_fk" FOREIGN KEY ("from_actor_id","world_id") REFERENCES "actor"("id","world_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kinship" ADD CONSTRAINT "kinship_to_actor_world_fk" FOREIGN KEY ("to_actor_id","world_id") REFERENCES "actor"("id","world_id") ON DELETE CASCADE;