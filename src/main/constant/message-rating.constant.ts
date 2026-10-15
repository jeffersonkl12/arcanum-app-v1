/** What the player thinks of a narrator reply: 1 is a thumbs up, -1 a thumbs down. */
export const MESSAGE_RATINGS = [1, -1] as const

export type MessageRating = (typeof MESSAGE_RATINGS)[number]
