import type { Database } from '@database/client.database'
import { messageRatingTable } from '@database/entity/message-rating.entity'
import type { MessageRating } from '@constant'
import { and, eq, inArray } from 'drizzle-orm'

export interface IMessageRatingRepository {
  /** Ratings of a world by message id. */
  listByWorld(worldId: string): Promise<Map<string, MessageRating>>
  /** Rates a message, replacing the rating it had. */
  set(worldId: string, messageId: string, value: MessageRating): Promise<void>
  remove(worldId: string, messageId: string): Promise<void>
  /** Forgets the ratings of messages that no longer exist. */
  removeMany(worldId: string, messageIds: string[]): Promise<void>
}

export class MessageRatingRepository implements IMessageRatingRepository {
  constructor(private readonly database: Database) {}

  async listByWorld(worldId: string): Promise<Map<string, MessageRating>> {
    const rows = await this.database
      .select()
      .from(messageRatingTable)
      .where(eq(messageRatingTable.worldId, worldId))

    return new Map(rows.map((row) => [row.messageId, row.value as MessageRating]))
  }

  async set(worldId: string, messageId: string, value: MessageRating): Promise<void> {
    await this.database
      .insert(messageRatingTable)
      .values({ messageId, worldId, value })
      .onConflictDoUpdate({
        target: messageRatingTable.messageId,
        set: { value, ratedAt: new Date() },
        // A message id is never reused across worlds, but never let one world rewrite another's.
        setWhere: eq(messageRatingTable.worldId, worldId)
      })
  }

  async remove(worldId: string, messageId: string): Promise<void> {
    await this.removeMany(worldId, [messageId])
  }

  async removeMany(worldId: string, messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return

    await this.database
      .delete(messageRatingTable)
      .where(
        and(
          eq(messageRatingTable.worldId, worldId),
          inArray(messageRatingTable.messageId, messageIds)
        )
      )
  }
}
