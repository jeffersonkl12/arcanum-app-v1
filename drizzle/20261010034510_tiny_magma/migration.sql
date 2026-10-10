CREATE TYPE "ai_provider" AS ENUM('google', 'openai', 'anthropic', 'deepseek');--> statement-breakpoint
CREATE TABLE "ai_setting" (
	"id" boolean PRIMARY KEY DEFAULT true,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"temperature" real NOT NULL,
	"encrypted_key" text,
	"key_hint" text,
	CONSTRAINT "ai_setting_single_row" CHECK ("id"),
	CONSTRAINT "ai_setting_key_hint" CHECK (("encrypted_key" is null) = ("key_hint" is null))
);
