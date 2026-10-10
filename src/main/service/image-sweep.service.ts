import type { ImageScope } from '@constant'
import type { IImageStorage } from '@lib/image-storage.lib'
import type { IImageRepository } from '@repository/image.repository'

/** The repository that knows which images of a scope are in use. */
export interface ImageOwner {
  scope: ImageScope
  repository: IImageRepository
}

export interface IImageSweepService {
  /** Deletes the stored images no entity points to, and returns how many it deleted. */
  sweep(): Promise<number>
}

/**
 * Garbage collection of the images folder. Deleting an entity does not touch its file (and a world
 * takes all its entities with it through the database cascade), so files are reclaimed here instead
 * of in every delete path. A scope is only swept against the repository registered for it, and a
 * scope nobody registered is never touched, so a forgotten owner cannot lose images.
 * Run it at startup, before anything can write images: a file is only "unused" while no write is
 * in flight.
 */
export class ImageSweepService implements IImageSweepService {
  constructor(
    private readonly imageStorage: IImageStorage,
    private readonly owners: readonly ImageOwner[]
  ) {}

  async sweep(): Promise<number> {
    let removed = 0

    for (const { scope, repository } of this.owners) {
      const inUse = new Set(await repository.listImagePaths())

      for (const imagePath of await this.imageStorage.list(scope)) {
        if (inUse.has(imagePath)) continue

        await this.imageStorage.remove(imagePath)
        removed++
      }
    }

    return removed
  }
}
