import { worldTable } from '@database/entity/world.entity'
import { pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'

export const cultureTable = pgTable(
  'culture',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default('')
  },
  (table) => [
    // Target of the composite foreign key of `actor`, which keeps an actor and its culture in the same world.
    unique('culture_id_world_id_unique').on(table.id, table.worldId)
  ]
)
