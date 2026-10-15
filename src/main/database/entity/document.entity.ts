import { DOCUMENT_LIMITS } from '@constant'
import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'

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
