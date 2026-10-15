import { ConflictError, NotFoundError } from '@error'
import type { PointOfInterest } from '@schema/point-of-interest.schema'
import type { IActorService } from '@service/actor.service'
import type { IPartyService } from '@service/party.service'
import type { IPointOfInterestService } from '@service/point-of-interest.service'
import { ancestorsOf } from '@util/point-of-interest.util'
import {
  MAX_PLACES_PER_CALL,
  type ActorMove,
  type ActorMoveOutcome,
  type IPointOfInterestRegistry,
  type PlaceCreationOutcome,
  type PlaceDraft,
  type PlaceView,
  type PartyMoveOutcome,
  type PlaceQuery,
  type PlaceSearch
} from '../../mastra/context/point-of-interest.context'

/**
 * The AI's door to the places of the game, the counterpart of the item registry. It decides
 * nothing: where an actor is, and that a place belongs to its world, are the engine's. What it adds
 * is what an AI caller needs:
 *
 * - **Batches.** Each move is tried in order and has its own outcome, so one refused move never
 *   loses the others.
 * - **World scope.** The ids come from the model, so every actor and place must belong to the
 *   world of the turn; anything else answers as if it did not exist.
 * - **Rule breaches as answers.** `ConflictError` and `NotFoundError` become a `reason` the model
 *   can act on; anything else is a bug and propagates.
 */
export class PointOfInterestRegistryService implements IPointOfInterestRegistry {
  constructor(
    private readonly pointOfInterestService: IPointOfInterestService,
    private readonly actorService: IActorService,
    private readonly partyService: IPartyService
  ) {}

  async findPlaces(worldId: string, query: PlaceQuery): Promise<PlaceSearch> {
    const [places, actors] = await Promise.all([
      this.pointOfInterestService.listByWorld(worldId),
      this.actorService.listByWorld(worldId)
    ])
    const placesById = new Map(places.map((place) => [place.id, place]))
    const { placeId, name, parentId, actorId } = query
    const hasFilter = Object.values(query).some((value) => value !== undefined)
    const actorPlaceId = actors.find((actor) => actor.id === actorId)?.pointOfInterestId
    const needle = name?.toLowerCase()

    const matches = places.filter(
      (place) =>
        (placeId === undefined || place.id === placeId) &&
        (needle === undefined || place.name.toLowerCase().includes(needle)) &&
        (actorId === undefined || place.id === actorPlaceId) &&
        // With no filter at all the search starts at the top of the tree.
        (parentId === undefined
          ? hasFilter || place.parentId === null
          : place.parentId === parentId)
    )

    return {
      total: matches.length,
      places: matches.slice(0, MAX_PLACES_PER_CALL).map((place) =>
        toPlaceView(
          place,
          [...ancestorsOf(place, placesById).reverse(), place],
          actors.filter((actor) => actor.pointOfInterestId === place.id)
        )
      )
    }
  }

  async createPlaces(worldId: string, drafts: PlaceDraft[]): Promise<PlaceCreationOutcome[]> {
    const outcomes: PlaceCreationOutcome[] = []

    for (const draft of drafts) {
      try {
        outcomes.push(await this.createOne(worldId, draft, outcomes))
      } catch (error) {
        outcomes.push({ ok: false, reason: reasonOf(error) })
      }
    }

    return outcomes
  }

  async moveActors(worldId: string, moves: ActorMove[]): Promise<ActorMoveOutcome[]> {
    const outcomes: ActorMoveOutcome[] = []

    for (const move of moves) {
      try {
        outcomes.push(await this.moveOne(worldId, move))
      } catch (error) {
        outcomes.push({ ok: false, actorId: move.actorId, reason: reasonOf(error) })
      }
    }

    return outcomes
  }

  async moveParty(worldId: string, placeId: string | null): Promise<PartyMoveOutcome> {
    try {
      const party = await this.partyService.findByWorld(worldId)

      if (!party) throw new ConflictError('The world has no party')

      const place = await this.requirePlace(worldId, placeId)
      const members = await this.partyService.move(party.id, placeId)

      if (members.length === 0) throw new ConflictError('The party has no members to move')

      return {
        ok: true,
        placeId,
        placeName: place?.name,
        movedActorIds: members.map((member) => member.id)
      }
    } catch (error) {
      return { ok: false, reason: reasonOf(error) }
    }
  }

  /** `earlier` are the outcomes of the places before this one in the call, which `parentIndex` points to. */
  private async createOne(
    worldId: string,
    { name, type, description, parentId, parentIndex }: PlaceDraft,
    earlier: PlaceCreationOutcome[]
  ): Promise<PlaceCreationOutcome> {
    if (parentId !== undefined && parentIndex !== undefined) {
      throw new ConflictError('Give either parentId or parentIndex, not both')
    }

    const parent = await this.resolveParent(worldId, parentId, parentIndex, earlier)
    const created = await this.pointOfInterestService.create({
      worldId,
      parentId: parent?.id ?? null,
      name,
      type,
      description: description ?? ''
    })
    const path = await this.pointOfInterestService.getPath(created.id)

    return { ok: true, place: toPlaceView(created, path, []) }
  }

  private async resolveParent(
    worldId: string,
    parentId: string | undefined,
    parentIndex: number | undefined,
    earlier: PlaceCreationOutcome[]
  ): Promise<PointOfInterest | null> {
    if (parentIndex !== undefined) {
      const sibling = earlier[parentIndex]

      if (!sibling?.ok || !sibling.place) {
        throw new ConflictError(
          `parentIndex ${parentIndex} is not an earlier place of this call that was created`
        )
      }

      return this.requirePlace(worldId, sibling.place.id)
    }

    return this.requirePlace(worldId, parentId ?? null)
  }

  private async moveOne(
    worldId: string,
    { actorId, placeId }: ActorMove
  ): Promise<ActorMoveOutcome> {
    const actor = await this.actorService.get(actorId)

    if (actor.worldId !== worldId) {
      throw new NotFoundError('Actor', actorId)
    }

    const place = await this.requirePlace(worldId, placeId)
    await this.actorService.update(actorId, { pointOfInterestId: placeId })

    return { ok: true, actorId, placeId, placeName: place?.name }
  }

  /** The place, checked to be in the world; `null` is "nowhere in particular" and needs no place. */
  private async requirePlace(
    worldId: string,
    placeId: string | null
  ): Promise<PointOfInterest | null> {
    if (placeId === null) return null

    const place = await this.pointOfInterestService.get(placeId)

    if (place.worldId !== worldId) {
      throw new NotFoundError('PointOfInterest', placeId)
    }

    return place
  }
}

/** A place as the AI reads it; `path` runs from the top down to the place itself. */
function toPlaceView(
  place: PointOfInterest,
  path: PointOfInterest[],
  actors: { id: string; name: string }[]
): PlaceView {
  return {
    id: place.id,
    name: place.name,
    type: place.type,
    description: place.description,
    parentId: place.parentId,
    path: path.map((step) => step.name),
    actors: actors.map((actor) => ({ id: actor.id, name: actor.name }))
  }
}

/** The answer for a rule breach; anything that is not one is a bug and keeps propagating. */
function reasonOf(error: unknown): string {
  if (error instanceof ConflictError || error instanceof NotFoundError) {
    return error.message
  }

  throw error
}
