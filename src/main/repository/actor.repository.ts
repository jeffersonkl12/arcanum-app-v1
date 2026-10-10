import type { Database } from '@database/client.database'
import { actorTable } from '@database/entity/actor.entity'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { Actor, CreateActor, UpdateActor } from '@schema/actor.schema'
import { asc, eq } from 'drizzle-orm'

export interface IActorRepository extends IRepository<Actor, CreateActor, UpdateActor> {
  listByWorld(worldId: string): Promise<Actor[]>
  listByParty(partyId: string): Promise<Actor[]>
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
}
