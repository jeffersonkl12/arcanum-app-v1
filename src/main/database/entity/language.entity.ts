import { cultureTable } from '@database/entity/culture.entity'
import { worldTable } from '@database/entity/world.entity'
import { foreignKey, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'

/** The language of a culture: it cannot exist without one. */
export const languageTable = pgTable(
  'language',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    cultureId: uuid('culture_id').notNull(),
    name: text('name').notNull()
  },
  (table) => [
    // Keeps a language and its culture in the same world; a culture that still has languages cannot
    // be deleted.
    foreignKey({
      name: 'language_culture_world_fk',
      columns: [table.cultureId, table.worldId],
      foreignColumns: [cultureTable.id, cultureTable.worldId]
    }),
    // Target of the composite foreign key of `actor`, which keeps an actor and its language in the same world.
    unique('language_id_world_id_unique').on(table.id, table.worldId)
  ]
)
