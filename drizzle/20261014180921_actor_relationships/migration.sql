CREATE TABLE "relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"from_actor_id" uuid NOT NULL,
	"to_actor_id" uuid NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "relationship_from_to_unique" UNIQUE("from_actor_id","to_actor_id"),
	CONSTRAINT "relationship_not_self" CHECK ("from_actor_id" <> "to_actor_id"),
	CONSTRAINT "relationship_value_range" CHECK ("value" between -100 and 100)
);
--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_from_actor_world_fk" FOREIGN KEY ("from_actor_id","world_id") REFERENCES "actor"("id","world_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_to_actor_world_fk" FOREIGN KEY ("to_actor_id","world_id") REFERENCES "actor"("id","world_id") ON DELETE CASCADE;