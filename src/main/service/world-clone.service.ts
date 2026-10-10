import { NotFoundError } from '@error'
import type { IWorldCloneRepository } from '@repository/world-clone.repository'
import type { CloneWorld } from '@schema/world-clone.schema'
import type { World } from '@schema/world.schema'

export interface IWorldCloneService {
  /** Starts from a copy of a world (typically a template). Throws `NotFoundError` if it is missing. */
  clone(input: CloneWorld): Promise<World>
}

/**
 * Copies a whole world: its cultures, languages, party and actors (player and NPCs) keep their data
 * and their links, with new ids. The copy is never a template, so a template can be cloned for every
 * new campaign. The campaign conversation is keyed by world id, so the copy starts with a fresh one.
 */
export class WorldCloneService implements IWorldCloneService {
  constructor(private readonly worldCloneRepository: IWorldCloneRepository) {}

  async clone({ sourceWorldId, name }: CloneWorld): Promise<World> {
    const world = await this.worldCloneRepository.clone(sourceWorldId, name)

    if (!world) {
      throw new NotFoundError('World', sourceWorldId)
    }

    return world
  }
}
