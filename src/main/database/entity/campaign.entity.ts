import { worldTable } from '@database/entity/world.entity'
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'

/**
 * The campaign played in a world. The world must not be a template (the campaign service checks it:
 * a foreign key cannot see another table's flag). Deleting the world deletes its campaign.
 */
export const campaignTable = pgTable('campaign', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Unique: a world has at most one campaign.
  worldId: uuid('world_id')
    .notNull()
    .unique('campaign_world_id_unique')
    .references(() => worldTable.id, { onDelete: 'cascade' }),
  // Macro summary of the plot: only the big events, kept coherent over many scenes and travel days.
  // The per-scene summaries live in the conversation memory, not here.
  summary: text('summary').notNull().default('')
})
