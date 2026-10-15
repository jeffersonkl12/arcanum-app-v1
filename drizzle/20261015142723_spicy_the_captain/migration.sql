CREATE TYPE "memory_kind" AS ENUM('betrayal', 'revelation', 'secret', 'promise', 'conflict', 'favor', 'bond', 'shared_moment', 'loss', 'other');--> statement-breakpoint
CREATE TABLE "memory_embedding_google" (
	"memory_id" uuid PRIMARY KEY,
	"embedding" vector(768) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_embedding_openai" (
	"memory_id" uuid PRIMARY KEY,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"kind" "memory_kind" NOT NULL,
	"importance" integer NOT NULL,
	"actor_ids" uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_importance_range" CHECK ("importance" between 1 and 5),
	CONSTRAINT "memory_actor_ids_not_empty" CHECK (cardinality("actor_ids") > 0)
);
--> statement-breakpoint
CREATE INDEX "memory_world_id_created_at_idx" ON "memory" ("world_id","created_at");--> statement-breakpoint
CREATE INDEX "memory_actor_ids_idx" ON "memory" USING gin ("actor_ids");--> statement-breakpoint
ALTER TABLE "memory_embedding_google" ADD CONSTRAINT "memory_embedding_google_memory_id_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memory"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memory_embedding_openai" ADD CONSTRAINT "memory_embedding_openai_memory_id_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memory"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memory" ADD CONSTRAINT "memory_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;