import { MESSAGE_RATINGS } from '@constant'
import type { messageRatingTable } from '@database/entity/message-rating.entity'
import { z } from 'zod'

export const messageRatingSchema = z.union(MESSAGE_RATINGS.map((value) => z.literal(value)))

/** Rates a narrator reply; `rating: null` takes the rating back. */
export const rateMessageSchema = z.object({
  worldId: z.uuid(),
  messageId: z.string().min(1).max(200),
  rating: messageRatingSchema.nullable()
})

export type MessageRatingRow = typeof messageRatingTable.$inferSelect
export type RateMessage = z.infer<typeof rateMessageSchema>
