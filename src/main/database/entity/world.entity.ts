import { WORLD_GENRES } from '@constant'
import { boolean, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'

export const worldGenreEnum = pgEnum('world_genre', WORLD_GENRES)

/** Root of the data model: every other entity belongs to exactly one world. */
export const worldTable = pgTable('world', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isTemplate: boolean('is_template').notNull().default(false),
  description: text('description').notNull().default(''),
  genre: worldGenreEnum('genre').notNull(),
  // Relative to the images folder (`world/<uuid>.png`), never absolute, and only ever written by the
  // image service: it is not part of the create/update schemas.
  imagePath: text('image_path')
})
