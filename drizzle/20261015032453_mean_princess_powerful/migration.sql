ALTER TABLE "item" ADD CONSTRAINT "item_description_length" CHECK (char_length("description") <= 500);--> statement-breakpoint
ALTER TABLE "point_of_interest" ADD CONSTRAINT "point_of_interest_description_length" CHECK (char_length("description") <= 500);--> statement-breakpoint
ALTER TABLE "world" ADD CONSTRAINT "world_description_length" CHECK (char_length("description") <= 500);