ALTER TABLE "ai_setting" ADD COLUMN "embedding_encrypted_key" text;--> statement-breakpoint
ALTER TABLE "ai_setting" ADD COLUMN "embedding_key_hint" text;--> statement-breakpoint
ALTER TABLE "ai_setting" ADD CONSTRAINT "ai_setting_embedding_key_hint" CHECK (("embedding_encrypted_key" is null) = ("embedding_key_hint" is null));