// Pure, with relative imports only: `src/mastra` loads the types that depend on it.
import type { ActorAttribute } from '../constant/actor-attribute.constant'
import { ACTOR_ATTRIBUTE_LEVELS } from '../constant/actor-attribute-level.constant'

/** The word for a score of an attribute, e.g. `strong`. Scores outside 1 to 6 are clamped. */
export function describeAttributeLevel(attribute: ActorAttribute, score: number): string {
  const levels = ACTOR_ATTRIBUTE_LEVELS[attribute]
  const index = Math.min(Math.max(Math.round(score), 1), levels.length) - 1

  return levels[index]
}
