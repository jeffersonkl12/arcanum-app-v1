CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"world_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "document_content_length" CHECK (char_length("content") <= 500)
);
--> statement-breakpoint
CREATE INDEX "document_world_id_subject_idx" ON "document" ("world_id","subject");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_world_id_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "world"("id") ON DELETE CASCADE;