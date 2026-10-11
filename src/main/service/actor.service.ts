import { ACTOR_HP } from '@constant'
import { ConflictError } from '@error'
import type { IActorRepository } from '@repository/actor.repository'
import type { IItemRepository } from '@repository/item.repository'
import type { Actor, CreateActor, UpdateActor } from '@schema/actor.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface IActorService extends ICrudService<Actor, CreateActor, UpdateActor> {
  listByWorld(worldId: string): Promise<Actor[]>
}

/**
 * A world has at most one player (`isNpc = false`), and an actor's culture, language and party must
 * belong to the actor's world; both rules surface as `ConflictError`, and so does health out of
 * range. Health is the engine's: a new actor gets the default of its role and starts at full
 * health, and lowering the maximum pulls the current health down with it.
 */
export class ActorService
  extends BaseService<Actor, CreateActor, UpdateActor>
  implements IActorService
{
  constructor(
    private readonly actorRepository: IActorRepository,
    private readonly itemRepository: IItemRepository
  ) {
    super(actorRepository, 'Actor')
  }

  /** The items the actor carried stay in the world, carried by nobody. */
  override async delete(id: string): Promise<void> {
    await this.itemRepository.releaseByActor(id)

    return super.delete(id)
  }

  override create(input: CreateActor): Promise<Actor> {
    const isPlayer = input.isNpc === false
    const hpMax = input.hpMax ?? (isPlayer ? ACTOR_HP.defaultPlayer : ACTOR_HP.defaultNpc)
    const hpCurrent = input.hpCurrent ?? hpMax
    assertHealth(hpCurrent, hpMax)

    return super.create({ ...input, hpMax, hpCurrent })
  }

  override async update(id: string, patch: UpdateActor): Promise<Actor> {
    if (patch.hpMax === undefined && patch.hpCurrent === undefined) {
      return super.update(id, patch)
    }

    const actor = await this.get(id)
    const hpMax = patch.hpMax ?? actor.hpMax
    const hpCurrent = patch.hpCurrent ?? Math.min(actor.hpCurrent, hpMax)
    assertHealth(hpCurrent, hpMax)

    return super.update(id, { ...patch, hpMax, hpCurrent })
  }

  listByWorld(worldId: string): Promise<Actor[]> {
    return this.actorRepository.listByWorld(worldId)
  }
}

function assertHealth(hpCurrent: number, hpMax: number): void {
  if (hpCurrent > hpMax) {
    throw new ConflictError('The current health cannot be higher than the maximum')
  }
}
