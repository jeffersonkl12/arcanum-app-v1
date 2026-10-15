import { TEXT_LIMITS, WORLD_GENRES } from '@constant'
import { sql } from 'drizzle-orm'
import { boolean, check, pgEnum, pgTable, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'

export const worldGenreEnum = pgEnum('world_genre', WORLD_GENRES)

/** Root of the data model: every other entity belongs to exactly one world. */
export const worldTable = pgTable(
  'world',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    isTemplate: boolean('is_template').notNull().default(false),
    description: text('description').notNull().default(''),
    genre: worldGenreEnum('genre').notNull(),
    // The template a campaign was cloned from, set only by the clone. Deleting the template keeps the
    // campaign and forgets where it came from.
    sourceWorldId: uuid('source_world_id').references((): AnyPgColumn => worldTable.id, {
      onDelete: 'set null'
    }),
    // Relative to the images folder (`world/<uuid>.png`), never absolute, and only ever written by the
    // image service: it is not part of the create/update schemas.
    imagePath: text('image_path')
  },
  (table) => [
    check(
      'world_description_length',
      sql`char_length(${table.description}) <= ${sql.raw(String(TEXT_LIMITS.description))}`
    )
  ]
)
