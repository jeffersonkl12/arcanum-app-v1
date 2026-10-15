import { DOCUMENT_LIMITS, EMBEDDING_MODELS, type EmbeddingProvider } from '@constant'
import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, uuid, vector } from 'drizzle-orm/pg-core'

/**
 * A piece of what the world knows about itself: one aspect (`category`) of one subject, written by
 * the player as plain text. It belongs to a world, template or campaign, and a world clone copies it.
 * The database is the source of truth; the search index over it is derived and can be rebuilt.
 * Several entries may share a subject and a category: a long text is just several entries.
 */
export const documentTable = pgTable(
  'document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    // Free text ("economia", "política", "regras"): what a category is has no rule attached to it.
    category: text('category').notNull(),
    content: text('content').notNull()
  },
  (table) => [
    index('document_world_id_subject_idx').on(table.worldId, table.subject),
    check(
      'document_content_length',
      sql`char_length(${table.content}) <= ${sql.raw(String(DOCUMENT_LIMITS.content))}`
    )
  ]
)

/**
 * The embedding of a document's text, made by one provider's model: one table per provider, since a
 * vector column has the size of its model and the vectors of two models are never comparable. A
 * document without a row here is not indexed for that provider yet (no key, a failed call, a
 * provider the player just switched to) and is caught up by `DocumentService`. The row goes with
 * its document. There is no ANN index on purpose: a world holds hundreds of documents, where an
 * exact scan is fast and never misses a match.
 */
export const documentEmbeddingOpenaiTable = pgTable('document_embedding_openai', {
  documentId: uuid('document_id')
    .primaryKey()
    .references(() => documentTable.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', { dimensions: EMBEDDING_MODELS.openai.dimensions }).notNull()
})

export const documentEmbeddingGoogleTable = pgTable('document_embedding_google', {
  documentId: uuid('document_id')
    .primaryKey()
    .references(() => documentTable.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', { dimensions: EMBEDDING_MODELS.google.dimensions }).notNull()
})

/** Same shape for every provider: only the table name and the size of the vector differ. */
export type DocumentEmbeddingTable =
  typeof documentEmbeddingOpenaiTable | typeof documentEmbeddingGoogleTable

/** The table of each provider; a new provider needs its own export above and an entry here. */
export const documentEmbeddingTables: Readonly<Record<EmbeddingProvider, DocumentEmbeddingTable>> =
  {
    openai: documentEmbeddingOpenaiTable,
    google: documentEmbeddingGoogleTable
  }
