import { RELATIONSHIP_LIMITS } from '@constant'
import { relationshipTable } from '@database/entity/relationship.entity'
import { z } from 'zod'

export const relationshipValueSchema = z
  .number()
  .int()
  .min(RELATIONSHIP_LIMITS.min)
  .max(RELATIONSHIP_LIMITS.max)

/** Sets what `fromActorId` feels about `toActorId`. */
export const setRelationshipSchema = z.object({
  fromActorId: z.uuid(),
  toActorId: z.uuid(),
  value: relationshipValueSchema
})

/** Moves what `fromActorId` feels about `toActorId` by `delta`, keeping it inside the limits. */
export const shiftRelationshipSchema = z.object({
  fromActorId: z.uuid(),
  toActorId: z.uuid(),
  delta: z
    .number()
    .int()
    .min(-RELATIONSHIP_LIMITS.max * 2)
    .max(RELATIONSHIP_LIMITS.max * 2)
})

export type Relationship = typeof relationshipTable.$inferSelect
export type SetRelationship = z.infer<typeof setRelationshipSchema>
export type ShiftRelationship = z.infer<typeof shiftRelationshipSchema>
