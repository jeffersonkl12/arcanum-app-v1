/** The attributes every actor has. */
export const ACTOR_ATTRIBUTES = ['strength', 'dexterity', 'intelligence'] as const

export type ActorAttribute = (typeof ACTOR_ATTRIBUTES)[number]

/**
 * Range of an attribute score. `default` is what an actor gets when the score is not given, and
 * `max` is a ceiling so a typo cannot make a character unbeatable.
 */
export const ACTOR_ATTRIBUTE_LIMITS = {
  min: 1,
  max: 20,
  default: 10
} as const
