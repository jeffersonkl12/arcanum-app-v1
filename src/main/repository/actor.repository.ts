import { ACTOR_COINS, type CoinSet } from '@constant'
import type { Database, DatabaseExecutor } from '@database/client.database'
import { actorTable } from '@database/entity/actor.entity'
import { translateDatabaseError } from '@database/error.database'
import { NotFoundError } from '@error'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { Actor, CreateActor, UpdateActor } from '@schema/actor.schema'
import { asc, eq, sql } from 'drizzle-orm'

/** Money that leaves `fromActorId` and arrives at `toActorId`; a missing end is the world itself. */
export interface CoinMove {
  fromActorId: string | null
  toActorId: string | null
  coins: CoinSet
}

/** The actors of a move as they are after it; an end that was `null` is absent. */
export interface CoinMoveResult {
  from?: Actor
  to?: Actor
}

export interface IActorRepository extends IRepository<Actor, CreateActor, UpdateActor> {
  listByWorld(worldId: string): Promise<Actor[]>
  listByParty(partyId: string): Promise<Actor[]>
  /**
   * Debits and credits in a single transaction, so money is never lost or created halfway. A
   * balance that would leave its range (a payer without enough coins) is refused with
   * `ConflictError`; an actor that does not exist is a `NotFoundError`. Nothing changes on failure.
   */
  transferCoins(move: CoinMove): Promise<CoinMoveResult>
}

export class ActorRepository
  extends BaseRepository<Actor, CreateActor, UpdateActor>
  implements IActorRepository
{
  constructor(database: Database) {
    super(database, actorTable)
  }

  listByWorld(worldId: string): Promise<Actor[]> {
    return this.database
      .select()
      .from(actorTable)
      .where(eq(actorTable.worldId, worldId))
      .orderBy(asc(actorTable.name))
  }

  listByParty(partyId: string): Promise<Actor[]> {
    return this.database
      .select()
      .from(actorTable)
      .where(eq(actorTable.partyId, partyId))
      .orderBy(asc(actorTable.name))
  }

  async transferCoins({ fromActorId, toActorId, coins }: CoinMove): Promise<CoinMoveResult> {
    try {
      return await this.database.transaction(async (tx) => ({
        from: fromActorId ? await this.shiftCoins(tx, fromActorId, coins, -1) : undefined,
        to: toActorId ? await this.shiftCoins(tx, toActorId, coins, 1) : undefined
      }))
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }

  /**
   * Adds (`direction` 1) or takes (-1) the coins in the database itself, not from a value read
   * earlier, and leaves the range check of the table to refuse a balance below zero or above the
   * ceiling.
   */
  private async shiftCoins(
    executor: DatabaseExecutor,
    actorId: string,
    coins: CoinSet,
    direction: 1 | -1
  ): Promise<Actor> {
    const shifted = Object.fromEntries(
      ACTOR_COINS.map((coin) => [coin, sql`${actorTable[coin]} + ${direction * coins[coin]}`])
    )
    const [actor] = await executor
      .update(actorTable)
      .set(shifted)
      .where(eq(actorTable.id, actorId))
      .returning()

    if (!actor) {
      throw new NotFoundError('Actor', actorId)
    }

    return actor
  }
}
