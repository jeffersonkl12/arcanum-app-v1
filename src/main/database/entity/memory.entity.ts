import {
  EMBEDDING_MODELS,
  MEMORY_IMPORTANCE,
  MEMORY_KINDS,
  type EmbeddingProvider
} from '@constant'
import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector
} from 'drizzle-orm/pg-core'

export const memoryKindEnum = pgEnum('memory_kind', MEMORY_KINDS)

/**
 * Something that happened which the actors involved remember. A memory shared by several actors is
 * one row with the list of their ids. It belongs to a campaign's world and goes with it. That the
 * actors are in the world is checked by `MemoryService`, which the database cannot express for an
 * array; one deleted later just stops being listed. The embedding of its summary lives in the table
 * of the embedding provider (`memoryEmbeddingTables`), because the vectors of two models differ in
 * size and are never comparable.
 */
export const memoryTable = pgTable(
  'memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    summary: text('summary').notNull(),
    kind: memoryKindEnum('kind').notNull(),
    importance: integer('importance').notNull(),
    actorIds: uuid('actor_ids').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('memory_world_id_created_at_idx').on(table.worldId, table.createdAt),
    index('memory_actor_ids_idx').using('gin', table.actorIds),
    check(
      'memory_importance_range',
      sql`${table.importance} between ${sql.raw(String(MEMORY_IMPORTANCE.min))} and ${sql.raw(String(MEMORY_IMPORTANCE.max))}`
    ),
    check('memory_actor_ids_not_empty', sql`cardinality(${table.actorIds}) > 0`)
  ]
)

/**
 * The embedding of a memory's summary, made by one provider's model. One table per provider, since
 * a vector column has the size of its model. There is no ANN index on purpose: a campaign holds
 * hundreds of memories, where an exact scan is fast and never misses a match.
 */
export const memoryEmbeddingOpenaiTable = pgTable('memory_embedding_openai', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memoryTable.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', { dimensions: EMBEDDING_MODELS.openai.dimensions }).notNull()
})

export const memoryEmbeddingGoogleTable = pgTable('memory_embedding_google', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memoryTable.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', { dimensions: EMBEDDING_MODELS.google.dimensions }).notNull()
})

/** Same shape for every provider: only the table name and the size of the vector differ. */
export type MemoryEmbeddingTable =
  typeof memoryEmbeddingOpenaiTable | typeof memoryEmbeddingGoogleTable

/** The table of each provider; a new provider needs its own export above and an entry here. */
export const memoryEmbeddingTables: Readonly<Record<EmbeddingProvider, MemoryEmbeddingTable>> = {
  openai: memoryEmbeddingOpenaiTable,
  google: memoryEmbeddingGoogleTable
}
