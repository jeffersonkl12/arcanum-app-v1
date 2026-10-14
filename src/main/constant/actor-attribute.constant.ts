// The narrator's UI vocabulary lists the attributes too, so the definition lives in `@shared`.
// Relative on purpose: `src/mastra` loads this file and the Mastra CLI does not resolve the aliases.
export * from '../../shared/actor-attribute.shared'

/**
 * Range of an attribute score, which is also the number of d6 a check with it rolls. A character
 * rolls 2d6 for each attribute and keeps the highest die, so a score is a single face (`min` 1,
 * `max` 6) and no attribute can pass 6. `default` is what an actor gets when the score is not
 * given: the average of the highest of 2d6, rounded.
 */
export const ACTOR_ATTRIBUTE_LIMITS = {
  min: 1,
  max: 6,
  default: 4
} as const
