import { NotFoundError } from '@error'
import type { IImageStorage } from '@lib/image-storage.lib'
import type { ImageCopy, IWorldCloneRepository } from '@repository/world-clone.repository'
import type { CloneWorld } from '@schema/world-clone.schema'
import type { World } from '@schema/world.schema'

export interface IWorldCloneService {
  /** Starts from a copy of a world (typically a template). Throws `NotFoundError` if it is missing. */
  clone(input: CloneWorld): Promise<World>
}

/**
 * Copies a whole world: its cultures, languages, party and actors (player and NPCs) keep their data
 * and their links, with new ids. The copy is never a template, so a template can be cloned for every
 * new campaign. The images are copied too, so editing or deleting one never affects the other world.
 * The campaign conversation is keyed by world id, so the copy starts with a fresh one.
 */
export class WorldCloneService implements IWorldCloneService {
  constructor(
    private readonly worldCloneRepository: IWorldCloneRepository,
    private readonly imageStorage: IImageStorage
  ) {}

  async clone({ sourceWorldId, name }: CloneWorld): Promise<World> {
    const clone = await this.worldCloneRepository.clone(sourceWorldId, name)

    if (!clone) {
      throw new NotFoundError('World', sourceWorldId)
    }

    await this.copyImages(clone.imageCopies)

    return clone.world
  }

  /**
   * The rows are already committed, so a file that cannot be copied (e.g. deleted from disk by
   * hand) must not fail the clone: the copy keeps the path and the image simply does not load.
   */
  private async copyImages(imageCopies: ImageCopy[]): Promise<void> {
    const results = await Promise.allSettled(
      imageCopies.map(({ from, to }) => this.imageStorage.copy(from, to))
    )

    for (const result of results) {
      if (result.status === 'rejected')
        console.error('Could not copy an image of a cloned world:', result.reason)
    }
  }
}
