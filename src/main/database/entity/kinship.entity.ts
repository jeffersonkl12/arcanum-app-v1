import { KINSHIP_KINDS } from '@constant'
import { actorTable } from '@database/entity/actor.entity'
import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import { check, foreignKey, pgEnum, pgTable, unique, uuid } from 'drizzle-orm/pg-core'

export const kinshipKindEnum = pgEnum('kinship_kind', KINSHIP_KINDS)

/**
 * A direct family bond between two actors of a world. For `parent`, `fromActor` is the parent and
 * `toActor` the child. For `spouse` there is no direction, so the row is stored with the smaller id
 * first and a pair has a single row. Siblings, grandparents, uncles and the rest are never stored:
 * the engine derives them. Both actors belong to the row's world and deleting either one deletes the row.
 */
export const kinshipTable = pgTable(
  'kinship',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    kind: kinshipKindEnum('kind').notNull(),
    fromActorId: uuid('from_actor_id').notNull(),
    toActorId: uuid('to_actor_id').notNull()
  },
  (table) => [
    // Composite foreign keys (id + world): both actors must belong to the row's world.
    foreignKey({
      name: 'kinship_from_actor_world_fk',
      columns: [table.fromActorId, table.worldId],
      foreignColumns: [actorTable.id, actorTable.worldId]
    }).onDelete('cascade'),
    foreignKey({
      name: 'kinship_to_actor_world_fk',
      columns: [table.toActorId, table.worldId],
      foreignColumns: [actorTable.id, actorTable.worldId]
    }).onDelete('cascade'),
    unique('kinship_from_to_unique').on(table.fromActorId, table.toActorId),
    check('kinship_not_self', sql`${table.fromActorId} <> ${table.toActorId}`)
  ]
)
