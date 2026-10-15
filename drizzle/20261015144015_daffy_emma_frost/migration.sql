CREATE TABLE "document_embedding_google" (
	"document_id" uuid PRIMARY KEY,
	"embedding" vector(768) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_embedding_openai" (
	"document_id" uuid PRIMARY KEY,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_embedding_google" ADD CONSTRAINT "document_embedding_google_document_id_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "document_embedding_openai" ADD CONSTRAINT "document_embedding_openai_document_id_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE;