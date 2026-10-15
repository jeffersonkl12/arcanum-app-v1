import { KINSHIP_INPUTS, type KinshipInput, type KinshipRelation } from '@constant'
import { kinshipTable } from '@database/entity/kinship.entity'
import { createActorInputSchema, type CreateActor } from '@schema/actor.schema'
import { z } from 'zod'

/** Most bonds a new actor can be created with. */
const MAX_NEW_RELATIVES = 20

export const kinshipInputSchema = z.enum(KINSHIP_INPUTS)

/** Records `relativeId` as the `relation` of `actorId` (`parent`: the relative is the actor's parent), replacing the bond they already had. */
export const setKinshipSchema = z.object({
  actorId: z.uuid(),
  relativeId: z.uuid(),
  relation: kinshipInputSchema
})

/** Removes the direct bond between two actors, whichever way it points. */
export const removeKinshipSchema = z.object({ actorId: z.uuid(), relativeId: z.uuid() })

/** A bond chosen in the creation form, before the actor exists. */
export const newRelativeSchema = z.object({
  relativeId: z.uuid(),
  relation: kinshipInputSchema
})

/** What the creation form submits: the actor and the relatives picked for it. */
export const createActorWithFamilySchema = createActorInputSchema.extend({
  relatives: z.array(newRelativeSchema).max(MAX_NEW_RELATIVES).optional()
})

export type Kinship = typeof kinshipTable.$inferSelect
export type SetKinship = z.infer<typeof setKinshipSchema>
export type RemoveKinship = z.infer<typeof removeKinshipSchema>
export type NewRelative = z.infer<typeof newRelativeSchema>
export type CreateActorWithFamily = z.infer<typeof createActorWithFamilySchema>

/** What the engine itself creates an actor with (the AI's NPCs may start nowhere), plus the bonds to record. */
export type CreateActorWithRelatives = CreateActor & { relatives?: NewRelative[] }

/** Someone in an actor's family: how they are related and, for a direct bond, what is stored. */
export interface FamilyMember {
  actorId: string
  name: string
  imagePath: string | null
  gender: string
  age: string
  relation: KinshipRelation
  /** The stored bond (`parent`, `child`, `spouse`) the player can edit or remove; `null` when derived. */
  direct: KinshipInput | null
}
