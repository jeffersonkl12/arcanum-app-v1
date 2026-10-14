// Pure, with relative imports only: `src/mastra` loads the types that depend on it.
import {
  RELATIONSHIP_LEVELS,
  RELATIONSHIP_LIMITS,
  type RelationshipLevel
} from '../constant/relationship.constant'

/** The value kept inside the limits and rounded to a whole number. */
export function clampRelationship(value: number): number {
  return Math.min(Math.max(Math.round(value), RELATIONSHIP_LIMITS.min), RELATIONSHIP_LIMITS.max)
}

/** The band of a value, e.g. 55 is `ally`. Values outside the limits are clamped. */
export function getRelationshipLevel(value: number): RelationshipLevel {
  const clamped = clampRelationship(value)
  const band = RELATIONSHIP_LEVELS.findLast((entry) => clamped >= entry.from)

  return (band ?? RELATIONSHIP_LEVELS[0]).level
}

/** What the band means for the narrator, e.g. `trusted friend, takes risks for the other`. */
export function describeRelationship(value: number): string {
  const level = getRelationshipLevel(value)

  return RELATIONSHIP_LEVELS.find((entry) => entry.level === level)!.meaning
}
