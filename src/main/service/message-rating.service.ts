import type { MessageRating } from '@constant'
import type { IMessageRatingRepository } from '@repository/message-rating.repository'

export interface IMessageRatingService {
  /** Ratings of a world by message id. */
  listByWorld(worldId: string): Promise<Map<string, MessageRating>>
  /** Rates a message; `null` takes the rating back. */
  rate(worldId: string, messageId: string, rating: MessageRating | null): Promise<void>
  /** Forgets the ratings of messages that were deleted from the conversation. */
  forget(worldId: string, messageIds: string[]): Promise<void>
}

/** Only stores the ratings: that the message exists is checked by whoever knows the conversation. */
export class MessageRatingService implements IMessageRatingService {
  constructor(private readonly repository: IMessageRatingRepository) {}

  listByWorld(worldId: string): Promise<Map<string, MessageRating>> {
    return this.repository.listByWorld(worldId)
  }

  async rate(worldId: string, messageId: string, rating: MessageRating | null): Promise<void> {
    if (rating === null) await this.repository.remove(worldId, messageId)
    else await this.repository.set(worldId, messageId, rating)
  }

  forget(worldId: string, messageIds: string[]): Promise<void> {
    return this.repository.removeMany(worldId, messageIds)
  }
}
