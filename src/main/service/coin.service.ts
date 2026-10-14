import { ACTOR_COINS, type CoinSet } from '@constant'
import { ConflictError, NotFoundError } from '@error'
import type { CoinMoveResult, IActorRepository } from '@repository/actor.repository'
import type { Actor } from '@schema/actor.schema'

export interface CoinTransferRequest {
  /** The payer, or `null` for money that comes from nowhere (a reward). */
  fromActorId: string | null
  /** The receiver, or `null` for money that is gone (spent, lost, taxed). */
  toActorId: string | null
  coins: CoinSet
}

export interface ICoinService {
  /**
   * Moves coins between two actors of the same world, or from or to the world itself. The payer
   * must carry enough of each coin and the receiver cannot go past the ceiling of a coin; coins are
   * never converted. Throws `NotFoundError` for an actor that does not exist and `ConflictError`
   * for a rule breach. Nothing changes on failure.
   */
  transfer(request: CoinTransferRequest): Promise<CoinMoveResult>
}

/** Money is three counters of the actor (gold, silver, bronze); this service owns how it moves. */
export class CoinService implements ICoinService {
  constructor(private readonly actorRepository: IActorRepository) {}

  async transfer(request: CoinTransferRequest): Promise<CoinMoveResult> {
    const { fromActorId, toActorId, coins } = request

    if (fromActorId === null && toActorId === null) {
      throw new ConflictError('A transfer needs a payer, a receiver, or both')
    }
    if (fromActorId === toActorId) {
      throw new ConflictError('An actor cannot pay itself')
    }
    if (ACTOR_COINS.every((coin) => coins[coin] === 0)) {
      throw new ConflictError('There is no money to transfer')
    }

    const payer = fromActorId ? await this.requireActor(fromActorId) : undefined
    const receiver = toActorId ? await this.requireActor(toActorId) : undefined
    if (payer && receiver && payer.worldId !== receiver.worldId) {
      throw new ConflictError('The actors belong to different worlds')
    }
    if (payer) {
      assertCanPay(payer, coins)
    }

    return this.actorRepository.transferCoins(request)
  }

  private async requireActor(actorId: string): Promise<Actor> {
    const actor = await this.actorRepository.findById(actorId)

    if (!actor) {
      throw new NotFoundError('Actor', actorId)
    }

    return actor
  }
}

/** The database refuses a negative balance too; this gives the reason in words. */
function assertCanPay(payer: Actor, coins: CoinSet): void {
  const short = ACTOR_COINS.filter((coin) => payer[coin] < coins[coin])

  if (short.length > 0) {
    const details = short.map((coin) => `has ${payer[coin]} ${label(coin)}, needs ${coins[coin]}`)

    throw new ConflictError(`${payer.name} does not have enough money: ${details.join('; ')}`)
  }
}

function label(coin: keyof CoinSet): string {
  return coin.replace('Pieces', ' pieces')
}
