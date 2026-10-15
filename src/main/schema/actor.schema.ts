import { ACTOR_ATTRIBUTE_LIMITS, ACTOR_COIN_LIMITS, ACTOR_HP, TEXT_LIMITS } from '@constant'
import { actorTable } from '@database/entity/actor.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

// Optional: an actor without a given score gets the default one.
const attributeScore = (schema: z.ZodNumber): z.ZodOptional<z.ZodNumber> =>
  schema.int().min(ACTOR_ATTRIBUTE_LIMITS.min).max(ACTOR_ATTRIBUTE_LIMITS.max).optional()

// Optional: an actor without a given amount starts with no coins.
const coinAmount = (schema: z.ZodNumber): z.ZodOptional<z.ZodNumber> =>
  schema.int().min(ACTOR_COIN_LIMITS.min).max(ACTOR_COIN_LIMITS.max).optional()

export const createActorSchema = createInsertSchema(actorTable, {
  name: (schema) => schema.trim().min(1).max(TEXT_LIMITS.name),
  profession: (schema) => schema.max(TEXT_LIMITS.shortText),
  appearance: (schema) => schema.max(TEXT_LIMITS.longText),
  personality: (schema) => schema.max(TEXT_LIMITS.longText),
  background: (schema) => schema.max(TEXT_LIMITS.longText),
  // Optional: the service fills what is missing, so the override must keep them optional.
  hpMax: (schema) => schema.min(ACTOR_HP.minMax).max(ACTOR_HP.max).optional(),
  hpCurrent: (schema) => schema.min(0).max(ACTOR_HP.max).optional(),
  strength: attributeScore,
  dexterity: attributeScore,
  intelligence: attributeScore,
  goldPieces: coinAmount,
  silverPieces: coinAmount,
  bronzePieces: coinAmount
}).omit({ id: true, imagePath: true })

/** The world of an existing actor cannot change: its culture, language, party and place belong to it. */
export const updateActorSchema = createActorSchema.omit({ worldId: true }).partial()

/**
 * What the player submits (create and edit forms): an actor is never created or edited without a
 * place. The column and `createActorSchema` stay nullable because, once in the world, an actor may
 * end up nowhere (`PointOfInterestRegistry`, `PartyService.move`); only the forms are strict.
 */
export const createActorInputSchema = createActorSchema.extend({ pointOfInterestId: z.uuid() })
export const updateActorInputSchema = updateActorSchema.extend({
  pointOfInterestId: z.uuid().optional()
})

export type Actor = typeof actorTable.$inferSelect
export type CreateActor = z.infer<typeof createActorSchema>
export type UpdateActor = z.infer<typeof updateActorSchema>
export type CreateActorInput = z.infer<typeof createActorInputSchema>
export type UpdateActorInput = z.infer<typeof updateActorInputSchema>
