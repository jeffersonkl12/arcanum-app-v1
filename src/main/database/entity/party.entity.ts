import { worldTable } from '@database/entity/world.entity'
import { pgTable, unique, uuid } from 'drizzle-orm/pg-core'

/** The members are the actors whose `partyId` points here (see the `members` relation). */
export const partyTable = pgTable(
  'party',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Unique: a world has at most one party.
    worldId: uuid('world_id')
      .notNull()
      .unique('party_world_id_unique')
      .references(() => worldTable.id, { onDelete: 'cascade' })
  },
  (table) => [
    // Target of the composite foreign key of `actor`, which keeps an actor and its party in the same world.
    unique('party_id_world_id_unique').on(table.id, table.worldId)
  ]
)
