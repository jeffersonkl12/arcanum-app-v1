import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { TEXT_LIMITS } from '../../main/constant/text-limit.constant'

/** Most places one search returns, so a single call cannot flood the context. */
export const MAX_PLACES_PER_CALL = 20

/** Most places one creation call takes. */
export const MAX_PLACES_CREATED_PER_CALL = 20

/** Most moves one batch call takes. */
export const MAX_MOVES_PER_CALL = 20

/**
 * Which places to look up. The filters add up. With no filter at all, the places at the top of the
 * world come back, which is where to start exploring the tree.
 */
export const placeQuerySchema = z.object({
  placeId: z.uuid().optional().describe('Exact id of a place.'),
  name: z.string().trim().min(1).optional().describe('Part of the name of the place.'),
  parentId: z.uuid().optional().describe('Only the places directly inside this place.'),
  actorId: z.uuid().optional().describe('Only the place where this actor is now.')
})

export type PlaceQuery = z.infer<typeof placeQuerySchema>

/** A place with where it sits and who is in it. */
export const placeViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  parentId: z.string().nullable(),
  /** Names from the top down to the place itself (`['Valdoria', 'Rusty Tankard', 'Room 3']`). */
  path: z.array(z.string()),
  /** Actors directly in this place, not in the places inside it. */
  actors: z.array(z.object({ id: z.string(), name: z.string() }))
})

export type PlaceView = z.infer<typeof placeViewSchema>

export const placeSearchSchema = z.object({
  places: z.array(placeViewSchema),
  /** How many places matched; more than `places.length` when the answer was cut. */
  total: z.number().int()
})

export type PlaceSearch = z.infer<typeof placeSearchSchema>

/**
 * A new place. It sits inside `parentId` (a place that already exists), or inside `parentIndex` (a
 * place created earlier in the same call, so a city and what it holds go in one call), or at the
 * top of the world when neither is given.
 */
export const placeDraftSchema = z.object({
  name: z.string().trim().min(1).max(TEXT_LIMITS.name),
  type: z
    .string()
    .trim()
    .min(1)
    .max(TEXT_LIMITS.shortText)
    .describe('What it is, in a word or two: city, village, tavern, house, bedroom...'),
  description: z.string().max(TEXT_LIMITS.description).optional(),
  parentId: z.uuid().optional().describe('Id of an existing place this one is inside of.'),
  parentIndex: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Position (from 0) of an earlier place of this same call this one is inside of.')
})

export type PlaceDraft = z.infer<typeof placeDraftSchema>

/** What happened to one place of a batch. */
export const placeCreationOutcomeSchema = z.object({
  ok: z.boolean(),
  place: placeViewSchema.optional().describe('The place as the engine registered it.'),
  reason: z.string().optional().describe('Why the engine refused this place.')
})

export type PlaceCreationOutcome = z.infer<typeof placeCreationOutcomeSchema>

/** One actor to move; `placeId: null` takes it out of any place. */
export const actorMoveSchema = z.object({
  actorId: z.uuid().describe('Id of the actor that moves.'),
  placeId: z
    .uuid()
    .nullable()
    .describe('Id of the place it ends up in, or null when it is nowhere in particular.')
})

export type ActorMove = z.infer<typeof actorMoveSchema>

/** What happened to one move of a batch. */
export const actorMoveOutcomeSchema = z.object({
  ok: z.boolean(),
  actorId: z.string().optional(),
  placeId: z.string().nullable().optional(),
  placeName: z.string().optional().describe('Name of the place the actor is in now.'),
  reason: z.string().optional().describe('Why the engine refused this move.')
})

export type ActorMoveOutcome = z.infer<typeof actorMoveOutcomeSchema>

export const partyMoveOutcomeSchema = z.object({
  ok: z.boolean(),
  placeId: z.string().nullable().optional(),
  placeName: z.string().optional(),
  movedActorIds: z.array(z.string()).optional().describe('Every member of the party, now there.'),
  reason: z.string().optional().describe('Why the engine refused the move.')
})

export type PartyMoveOutcome = z.infer<typeof partyMoveOutcomeSchema>

/**
 * Port to the game engine's places, implemented in the main process. Like `IItemRegistry`, it is
 * the only way the AI sees and creates places and changes where actors are: every id comes from the model, so it is
 * checked to belong to `worldId`.
 */
export interface IPointOfInterestRegistry {
  findPlaces(worldId: string, query: PlaceQuery): Promise<PlaceSearch>
  createPlaces(worldId: string, drafts: PlaceDraft[]): Promise<PlaceCreationOutcome[]>
  moveActors(worldId: string, moves: ActorMove[]): Promise<ActorMoveOutcome[]>
  moveParty(worldId: string, placeId: string | null): Promise<PartyMoveOutcome>
}
