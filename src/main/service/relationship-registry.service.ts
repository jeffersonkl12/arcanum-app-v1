import { RELATIONSHIP_LIMITS, RELATIONSHIP_SHIFTS } from '@constant'
import { ConflictError, NotFoundError } from '@error'
import type { IActorService } from '@service/actor.service'
import type { IRelationshipService } from '@service/relationship.service'
import { getRelationshipLevel } from '@util/relationship.util'
import type {
  IRelationshipRegistry,
  RelationshipChange,
  RelationshipOutcome
} from '../../mastra/context/relationship.context'

/**
 * The AI's door to the relationships of the game, the counterpart of the coin registry. Rules and
 * limits are `IRelationshipService`'s. What it adds is what an AI caller needs:
 *
 * - **Batches.** Each change is tried in order and has its own outcome, so one refused change never
 *   loses the others.
 * - **World scope.** The ids come from the model, so both actors must belong to the world of the
 *   turn; anything else answers as if it did not exist.
 * - **Rule breaches as answers.** `ConflictError` and `NotFoundError` become a `reason` the model
 *   can act on; anything else is a bug and propagates.
 */
export class RelationshipRegistryService implements IRelationshipRegistry {
  constructor(
    private readonly relationshipService: IRelationshipService,
    private readonly actorService: IActorService
  ) {}

  async adjust(worldId: string, changes: RelationshipChange[]): Promise<RelationshipOutcome[]> {
    const outcomes: RelationshipOutcome[] = []

    for (const change of changes) {
      try {
        outcomes.push(await this.adjustOne(worldId, change))
      } catch (error) {
        outcomes.push({ ok: false, reason: reasonOf(error) })
      }
    }

    return outcomes
  }

  private async adjustOne(
    worldId: string,
    { fromActorId, toActorId, shift }: RelationshipChange
  ): Promise<RelationshipOutcome> {
    for (const actorId of [fromActorId, toActorId]) {
      await this.requireActor(worldId, actorId)
    }
    if (fromActorId === toActorId) {
      throw new ConflictError('An actor has no relationship with itself')
    }

    const [stored] = (await this.relationshipService.listAmong([fromActorId, toActorId])).filter(
      (row) => row.fromActorId === fromActorId && row.toActorId === toActorId
    )
    const previous = stored?.value ?? RELATIONSHIP_LIMITS.default
    const { value } = await this.relationshipService.shift(
      fromActorId,
      toActorId,
      RELATIONSHIP_SHIFTS[shift].delta
    )

    return {
      ok: true,
      fromActorId,
      toActorId,
      previousLevel: getRelationshipLevel(previous),
      level: getRelationshipLevel(value),
      value
    }
  }

  private async requireActor(worldId: string, actorId: string): Promise<void> {
    const actor = await this.actorService.get(actorId)

    if (actor.worldId !== worldId) {
      throw new NotFoundError('Actor', actorId)
    }
  }
}

/** The answer for a rule breach; anything that is not one is a bug and keeps propagating. */
function reasonOf(error: unknown): string {
  if (error instanceof ConflictError || error instanceof NotFoundError) {
    return error.message
  }

  throw error
}
