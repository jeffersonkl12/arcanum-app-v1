import { MESSAGE_RATINGS } from '@constant'
import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import { check, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * What the player thought of a narrator reply. The messages themselves live in Mastra's memory, so
 * `messageId` is Mastra's id (not a uuid) and the service checks that the message exists. A message
 * has at most one rating; deleting the world deletes its ratings.
 */
export const messageRatingTable = pgTable(
  'message_rating',
  {
    messageId: text('message_id').primaryKey(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    value: smallint('value').notNull(),
    ratedAt: timestamp('rated_at').notNull().defaultNow()
  },
  (table) => [
    check('message_rating_value', sql`${table.value} in (${sql.raw(MESSAGE_RATINGS.join(', '))})`)
  ]
)
