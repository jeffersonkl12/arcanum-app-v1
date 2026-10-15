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

/** What `from` feels about each of the `others`; `values` maps `fromId:toId` to the stored value, a pair with no entry is neutral. */
export function describeFeelings(
  from: { id: string },
  others: readonly { id: string; name: string }[],
  values: ReadonlyMap<string, number>
): {
  targetId: string
  targetName: string
  value: number
  level: RelationshipLevel
  meaning: string
}[] {
  return others
    .filter((other) => other.id !== from.id)
    .map((other) => {
      const value = values.get(`${from.id}:${other.id}`) ?? RELATIONSHIP_LIMITS.default

      return {
        targetId: other.id,
        targetName: other.name,
        value,
        level: getRelationshipLevel(value),
        meaning: describeRelationship(value)
      }
    })
}
