import { RELATIONSHIP_LIMITS } from '@constant'
import { actorTable } from '@database/entity/actor.entity'
import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import { check, foreignKey, integer, pgTable, unique, uuid } from 'drizzle-orm/pg-core'

/**
 * What `fromActor` feels about `toActor`, from -100 to 100. It is directed (the opposite direction
 * is its own row) and works between any two actors: player and NPC, NPC and NPC. A pair with no row
 * is neutral. Both actors belong to the row's world and deleting either one deletes the row.
 */
export const relationshipTable = pgTable(
  'relationship',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    fromActorId: uuid('from_actor_id').notNull(),
    toActorId: uuid('to_actor_id').notNull(),
    value: integer('value').notNull().default(RELATIONSHIP_LIMITS.default)
  },
  (table) => [
    // Composite foreign keys (id + world): both actors must belong to the row's world.
    foreignKey({
      name: 'relationship_from_actor_world_fk',
      columns: [table.fromActorId, table.worldId],
      foreignColumns: [actorTable.id, actorTable.worldId]
    }).onDelete('cascade'),
    foreignKey({
      name: 'relationship_to_actor_world_fk',
      columns: [table.toActorId, table.worldId],
      foreignColumns: [actorTable.id, actorTable.worldId]
    }).onDelete('cascade'),
    unique('relationship_from_to_unique').on(table.fromActorId, table.toActorId),
    check('relationship_not_self', sql`${table.fromActorId} <> ${table.toActorId}`),
    check(
      'relationship_value_range',
      sql`${table.value} between ${sql.raw(String(RELATIONSHIP_LIMITS.min))} and ${sql.raw(String(RELATIONSHIP_LIMITS.max))}`
    )
  ]
)
