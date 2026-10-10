import type { IActorRepository } from '@repository/actor.repository'
import type { Actor, CreateActor, UpdateActor } from '@schema/actor.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface IActorService extends ICrudService<Actor, CreateActor, UpdateActor> {
  listByWorld(worldId: string): Promise<Actor[]>
}

/**
 * A world has at most one player (`isNpc = false`), and an actor's culture, language and party must
 * belong to the actor's world; both rules surface as `ConflictError`.
 */
export class ActorService
  extends BaseService<Actor, CreateActor, UpdateActor>
  implements IActorService
{
  constructor(private readonly actorRepository: IActorRepository) {
    super(actorRepository, 'Actor')
  }

  listByWorld(worldId: string): Promise<Actor[]> {
    return this.actorRepository.listByWorld(worldId)
  }
}
