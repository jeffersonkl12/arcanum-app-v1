ALTER TABLE "language" ADD COLUMN "culture_id" uuid;--> statement-breakpoint
-- Languages that already exist go to the first culture (by name) of their world.
UPDATE "language" SET "culture_id" = (
  SELECT "culture"."id" FROM "culture"
  WHERE "culture"."world_id" = "language"."world_id"
  ORDER BY "culture"."name", "culture"."id" LIMIT 1
);--> statement-breakpoint
-- A language cannot exist without a culture: the ones of a world with no culture are dropped.
UPDATE "actor" SET "language_id" = NULL
WHERE "language_id" IN (SELECT "id" FROM "language" WHERE "culture_id" IS NULL);--> statement-breakpoint
DELETE FROM "language" WHERE "culture_id" IS NULL;--> statement-breakpoint
ALTER TABLE "language" ALTER COLUMN "culture_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "language" ADD CONSTRAINT "language_culture_world_fk" FOREIGN KEY ("culture_id","world_id") REFERENCES "culture"("id","world_id");
