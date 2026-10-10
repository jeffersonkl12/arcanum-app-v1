import type { IWorldRepository } from '@repository/world.repository'
import type { CreateWorld, UpdateWorld, World, WorldFilter } from '@schema/world.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface IWorldService extends ICrudService<World, CreateWorld, UpdateWorld> {
  list(filter?: WorldFilter): Promise<World[]>
}

/** Deleting a world also deletes everything that belongs to it. */
export class WorldService
  extends BaseService<World, CreateWorld, UpdateWorld>
  implements IWorldService
{
  constructor(private readonly worldRepository: IWorldRepository) {
    super(worldRepository, 'World')
  }

  list(filter?: WorldFilter): Promise<World[]> {
    return this.worldRepository.list(filter)
  }
}
