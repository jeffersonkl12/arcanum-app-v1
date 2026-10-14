import { ConflictError, NotFoundError } from '@error'
import type { Actor } from '@schema/actor.schema'
import type { IActorService } from '@service/actor.service'
import type { ICoinService } from '@service/coin.service'
import type {
  CoinOutcome,
  CoinPurse,
  CoinTransfer,
  ICoinRegistry
} from '../../mastra/context/coin.context'

/**
 * The AI's door to the money of the game, the counterpart of the item registry. It does no rule
 * checking of its own: balances and limits are `ICoinService`'s. What it adds is what an AI caller
 * needs and the UI does not:
 *
 * - **Batches.** Each transfer is tried in order and has its own outcome, so one refused transfer
 *   never loses the others. Order matters because a balance is checked after the earlier ones.
 * - **World scope.** The ids come from the model, so every actor must belong to the world of the
 *   turn; anything else answers as if it did not exist.
 * - **Rule breaches as answers.** `ConflictError` and `NotFoundError` become a `reason` the model
 *   can act on; anything else is a bug and propagates.
 */
export class CoinRegistryService implements ICoinRegistry {
  constructor(
    private readonly coinService: ICoinService,
    private readonly actorService: IActorService
  ) {}

  async transferCoins(worldId: string, transfers: CoinTransfer[]): Promise<CoinOutcome[]> {
    const outcomes: CoinOutcome[] = []

    for (const transfer of transfers) {
      try {
        outcomes.push(await this.transferOne(worldId, transfer))
      } catch (error) {
        outcomes.push({ ok: false, reason: reasonOf(error) })
      }
    }

    return outcomes
  }

  private async transferOne(
    worldId: string,
    { fromActorId, toActorId, goldPieces, silverPieces, bronzePieces }: CoinTransfer
  ): Promise<CoinOutcome> {
    for (const actorId of [fromActorId, toActorId]) {
      if (actorId !== null) {
        await this.requireActor(worldId, actorId)
      }
    }

    const { from, to } = await this.coinService.transfer({
      fromActorId,
      toActorId,
      coins: {
        goldPieces: goldPieces ?? 0,
        silverPieces: silverPieces ?? 0,
        bronzePieces: bronzePieces ?? 0
      }
    })

    return { ok: true, from: from && toPurse(from), to: to && toPurse(to) }
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

function toPurse(actor: Actor): CoinPurse {
  return {
    actorId: actor.id,
    goldPieces: actor.goldPieces,
    silverPieces: actor.silverPieces,
    bronzePieces: actor.bronzePieces
  }
}
