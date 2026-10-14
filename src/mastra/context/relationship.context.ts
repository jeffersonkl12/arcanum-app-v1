import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import {
  MAX_RELATIONSHIP_CHANGES_PER_CALL,
  RELATIONSHIP_SHIFT_NAMES,
  RELATIONSHIP_SHIFTS
} from '../../main/constant/relationship.constant'

export { MAX_RELATIONSHIP_CHANGES_PER_CALL }

/**
 * How one actor's feeling about another moved because of an interaction. It is directed: when an
 * interaction affects both sides, each side is its own change (the one who insults and the one who
 * is insulted do not end up feeling the same).
 */
export const relationshipChangeSchema = z.object({
  fromActorId: z.uuid().describe('Id of the actor whose feeling changes.'),
  toActorId: z.uuid().describe('Id of the actor the feeling is about.'),
  shift: z
    .enum(RELATIONSHIP_SHIFT_NAMES)
    .describe(
      'How big the interaction is for this side, by direction and size. The engine decides the number. ' +
        RELATIONSHIP_SHIFT_NAMES.map(
          (name) => `${name} (${RELATIONSHIP_SHIFTS[name].example})`
        ).join('; ')
    ),
  reason: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe('The interaction in one short sentence, e.g. "shared a secret about his past".')
})

export type RelationshipChange = z.infer<typeof relationshipChangeSchema>

/** What happened to one change of a batch; a batch never stops at a failure. */
export const relationshipOutcomeSchema = z.object({
  ok: z.boolean(),
  fromActorId: z.string().optional(),
  toActorId: z.string().optional(),
  previousLevel: z.string().optional().describe('The band before the change, e.g. `neutral`.'),
  level: z.string().optional().describe('The band now, e.g. `friendly`.'),
  value: z.number().int().optional().describe('From -100 to 100, as it is now.'),
  reason: z.string().optional().describe('Why the engine refused this change.')
})

export type RelationshipOutcome = z.infer<typeof relationshipOutcomeSchema>

/**
 * Port to the game engine's relationships, implemented in the main process. The AI only says that an
 * interaction happened and how big it was; the stored value, its limits and the band are the engine's.
 * Every actor id is checked to belong to `worldId`, because the ids come from the model.
 */
export interface IRelationshipRegistry {
  adjust(worldId: string, changes: RelationshipChange[]): Promise<RelationshipOutcome[]>
}
