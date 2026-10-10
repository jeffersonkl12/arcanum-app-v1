import { worldTable } from '@database/entity/world.entity'
import { pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'

export const languageTable = pgTable(
  'language',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default('')
  },
  (table) => [
    // Target of the composite foreign key of `actor`, which keeps an actor and its language in the same world.
    unique('language_id_world_id_unique').on(table.id, table.worldId)
  ]
)
